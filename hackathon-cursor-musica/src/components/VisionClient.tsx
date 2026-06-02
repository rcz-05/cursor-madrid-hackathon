"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  VISION_HIT_EVENT,
  VISION_WS_URL,
  type VisionEvent,
  type VisionMessage,
} from "@/lib/vision";

// Width we downscale webcam frames to before sending. Smaller = faster.
const SEND_WIDTH = 416;
// How often to send a frame (ms). ~8 fps keeps the backend comfortable.
const SEND_INTERVAL_MS = 120;
const JPEG_QUALITY = 0.65;

type Status = "idle" | "connecting" | "connected" | "closed" | "error";

export default function VisionClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>("");
  const [personDetected, setPersonDetected] = useState(false);
  const [fps, setFps] = useState(0);
  const [device, setDevice] = useState<string>("");
  const [lastEvent, setLastEvent] = useState<string>("");
  const [hitCount, setHitCount] = useState(0);
  const [beep, setBeep] = useState(true);

  // Local fallback "drum" so the vision page is demoable on its own, before the
  // music branch is wired in. Still dispatches `vision:hit` either way.
  const playBeep = useCallback((event: VisionEvent) => {
    if (!beep) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // Map each zone to a distinct pitch.
      const freqs: Record<string, number> = {
        upper_right_arm: 330,
        upper_left_arm: 392,
        lower_right_arm: 494,
        lower_left_arm: 587,
        right_leg: 196,
        left_leg: 147,
      };
      osc.frequency.value = freqs[event.zone] ?? 440;
      osc.type = "triangle";
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // Audio is best-effort; never break the loop over it.
    }
  }, [beep]);

  const sendFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ws = wsRef.current;
    if (!video || !canvas || !ws || ws.readyState !== WebSocket.OPEN) return;
    if (!video.videoWidth) return;

    canvas.width = SEND_WIDTH;
    canvas.height = Math.round((video.videoHeight / video.videoWidth) * SEND_WIDTH);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    ws.send(JSON.stringify({ image }));
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    wsRef.current?.close();
    wsRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setRunning(false);
    setStatus("closed");
    setPersonDetected(false);
  }, []);

  const start = useCallback(async () => {
    setError("");
    setStatus("connecting");
    try {
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
          setPersonDetected(Boolean(data.debug.person_detected));
          if (typeof data.debug.fps === "number") setFps(data.debug.fps);
          if (data.debug.device) setDevice(data.debug.device);
        }
        if (data.events?.length) {
          for (const event of data.events) {
            setLastEvent(`${event.zone} via ${event.hand}`);
            setHitCount((c) => c + 1);
            playBeep(event);
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
  }, [sendFrame, playBeep]);

  // Clean up on unmount.
  useEffect(() => stop, [stop]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-[480px] max-w-full overflow-hidden rounded-xl border border-zinc-200 bg-black dark:border-zinc-800">
        <video ref={videoRef} muted playsInline className="w-full" />
        {!running && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
            camera off
          </div>
        )}
        {personDetected && (
          <span className="absolute right-2 top-2 rounded-full bg-emerald-500/90 px-2 py-0.5 text-xs font-medium text-white">
            person
          </span>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex flex-wrap items-center gap-3">
        {!running ? (
          <button
            onClick={start}
            className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors hover:opacity-90"
          >
            Start camera
          </button>
        ) : (
          <button
            onClick={stop}
            className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-zinc-700"
          >
            Stop
          </button>
        )}
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={beep}
            onChange={(e) => setBeep(e.target.checked)}
          />
          test beep
        </label>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
        <Stat label="status" value={status} />
        <Stat label="fps" value={running ? String(fps) : "—"} />
        <Stat label="device" value={device || "—"} />
        <Stat label="hits" value={String(hitCount)} />
      </dl>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        last hit: <span className="font-medium">{lastEvent || "none"}</span>
      </p>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="font-medium text-black dark:text-zinc-50">{value}</dd>
    </div>
  );
}
