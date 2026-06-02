"use client";

import { Button } from "@/components/ui/button";
import {
  SKELETON_EDGES,
  VISION_HIT_EVENT,
  VISION_WS_URL,
  type DrumZone,
  type Keypoint,
  type VisionDebug,
  type VisionEvent,
  type VisionMessage,
} from "@/lib/vision";
import { useCallback, useEffect, useRef, useState } from "react";

// Width we downscale webcam frames to before sending. Smaller = faster.
const SEND_WIDTH = 416;
// How often to send a frame (ms). ~8 fps keeps the backend comfortable.
const SEND_INTERVAL_MS = 120;
const JPEG_QUALITY = 0.65;
const FLASH_MS = 220;

// Per-zone overlay colors (oklch) — echo the drum-hit palette loosely.
const ZONE_COLORS: Record<DrumZone, string> = {
  upper_left_arm: "oklch(0.82 0.14 210)",
  lower_left_arm: "oklch(0.75 0.2 45)",
  upper_right_arm: "oklch(0.82 0.18 145)",
  lower_right_arm: "oklch(0.72 0.22 300)",
  left_leg: "oklch(0.72 0.22 25)",
  right_leg: "oklch(0.78 0.16 75)",
};

type Status = "idle" | "connecting" | "connected" | "closed" | "error";

type VisionClientProps = {
  /** Called once on the user's "Start" gesture (e.g. to unlock audio). */
  onStart?: () => void | Promise<void>;
  /** Called for every detected hit event. */
  onHit?: (event: VisionEvent) => void;
};

export function VisionClient({ onStart, onHit }: VisionClientProps = {}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sendCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Latest overlay payload + per-zone flash expiry, read by the draw loop.
  const debugRef = useRef<VisionDebug>({});
  const flashRef = useRef<Map<DrumZone, number>>(new Map());

  const [status, setStatus] = useState<Status>("idle");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>("");
  const [personDetected, setPersonDetected] = useState(false);
  const [fps, setFps] = useState(0);
  const [device, setDevice] = useState<string>("");
  const [lastEvent, setLastEvent] = useState<string>("");
  const [hitCount, setHitCount] = useState(0);

  const sendFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = sendCanvasRef.current;
    const ws = wsRef.current;
    if (!video || !canvas || !ws || ws.readyState !== WebSocket.OPEN) return;
    if (!video.videoWidth) return;

    canvas.width = SEND_WIDTH;
    canvas.height = Math.round((video.videoHeight / video.videoWidth) * SEND_WIDTH);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ws.send(JSON.stringify({ image: canvas.toDataURL("image/jpeg", JPEG_QUALITY) }));
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    debugRef.current = {};
    setRunning(false);
    setStatus("closed");
    setPersonDetected(false);
  }, []);

  const start = useCallback(async () => {
    setError("");
    setStatus("connecting");
    try {
      // Run the start hook first so audio unlocks inside the user gesture.
      await onStart?.();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const ws = new WebSocket(VISION_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
        setRunning(true);
        intervalRef.current = window.setInterval(sendFrame, SEND_INTERVAL_MS);
      };

      ws.onmessage = (msg) => {
        const data: VisionMessage = JSON.parse(msg.data);
        if (data.debug) {
          debugRef.current = data.debug;
          setPersonDetected(Boolean(data.debug.person_detected));
          if (typeof data.debug.fps === "number") setFps(data.debug.fps);
          if (data.debug.device) setDevice(data.debug.device);
        }
        if (data.events?.length) {
          for (const event of data.events) {
            flashRef.current.set(event.zone, performance.now() + FLASH_MS);
            setLastEvent(`${event.zone} · ${event.hand}`);
            setHitCount((c) => c + 1);
            onHit?.(event);
            window.dispatchEvent(
              new CustomEvent<VisionEvent>(VISION_HIT_EVENT, { detail: event }),
            );
          }
        }
      };

      ws.onerror = () => {
        setStatus("error");
        setError(`Could not reach vision backend at ${VISION_WS_URL}`);
      };
      ws.onclose = () => setStatus("closed");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [onHit, onStart, sendFrame]);

  // Draw the pose overlay (skeleton + keypoint circles + zone capsules) while
  // running, on its own requestAnimationFrame loop.
  useEffect(() => {
    if (!running) return;
    let raf = 0;

    function paint() {
      raf = requestAnimationFrame(paint);
      const canvas = overlayRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      const w = video.clientWidth;
      const h = video.clientHeight;
      if (!w || !h) return;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      const { keypoints = [], segments = [], zone_radius } = debugRef.current;
      if (!keypoints.length) return;

      const byName = new Map<string, Keypoint>(keypoints.map((k) => [k.name, k]));
      const now = performance.now();
      // True hit-box width in display px (diameter = 2 * radius). zone_radius is
      // normalized to frame width, so scale by canvas width.
      const hitWidth = (zone_radius ?? 0.06) * w * 2;

      // Skeleton lines.
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      for (const [a, b] of SKELETON_EDGES) {
        const pa = byName.get(a);
        const pb = byName.get(b);
        if (!pa || !pb) continue;
        ctx.beginPath();
        ctx.moveTo(pa.x * w, pa.y * h);
        ctx.lineTo(pb.x * w, pb.y * h);
        ctx.stroke();
      }

      // Zone capsules drawn at the TRUE hit width, so what you see is exactly
      // what triggers. Brighter while flashing from a hit.
      ctx.lineCap = "round";
      for (const seg of segments) {
        const flashing = (flashRef.current.get(seg.zone) ?? 0) > now;
        ctx.lineWidth = hitWidth;
        ctx.globalAlpha = flashing ? 0.85 : 0.28;
        ctx.strokeStyle = ZONE_COLORS[seg.zone];
        ctx.beginPath();
        ctx.moveTo(seg.ax * w, seg.ay * h);
        ctx.lineTo(seg.bx * w, seg.by * h);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.lineCap = "butt";

      // Keypoint dots.
      ctx.fillStyle = "white";
      for (const k of keypoints) {
        ctx.beginPath();
        ctx.arc(k.x * w, k.y * h, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  useEffect(() => stop, [stop]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-black">
        {/* Mirror video + overlay together so coordinates stay aligned. */}
        <video
          ref={videoRef}
          muted
          playsInline
          className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
        />
        <canvas
          ref={overlayRef}
          className="absolute inset-0 h-full w-full -scale-x-100"
        />
        {!running && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
            camera off
          </div>
        )}
        {personDetected && (
          <span className="absolute right-3 top-3 rounded-full bg-emerald-500/90 px-2 py-0.5 text-xs font-medium text-white">
            person
          </span>
        )}
      </div>
      <canvas ref={sendCanvasRef} className="hidden" />

      <div className="flex flex-wrap items-center gap-3">
        {!running ? (
          <Button size="lg" onClick={() => void start()}>
            Start camera &amp; audio
          </Button>
        ) : (
          <Button size="lg" variant="outline" onClick={stop}>
            Stop
          </Button>
        )}
        <span className="text-sm text-muted-foreground">
          last hit: <span className="font-medium text-foreground">{lastEvent || "none"}</span>
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
        <Stat label="status" value={status} />
        <Stat label="fps" value={running ? String(fps) : "—"} />
        <Stat label="device" value={device || "—"} />
        <Stat label="hits" value={String(hitCount)} />
      </dl>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
