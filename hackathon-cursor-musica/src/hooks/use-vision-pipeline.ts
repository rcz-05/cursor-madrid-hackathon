"use client";

import type { DrumCode } from "@/lib/drum-codes";
import { DrumPlayer } from "@/lib/drum-player";
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
const SEND_INTERVAL_MS = 100;
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

// Map each body zone to one of the six drum codes. DrumPlayer.play() also fires
// the global on-screen sound-name overlay (KICK / SNARE / HI-HAT …).
const ZONE_TO_DRUM: Record<DrumZone, DrumCode> = {
  upper_left_arm: "arm_left_high", // HI-HAT
  lower_left_arm: "arm_left_low", // SNARE
  upper_right_arm: "arm_right_high", // CRASH
  lower_right_arm: "arm_right_low", // LOW TOM
  left_leg: "feet_1", // KICK
  right_leg: "feet_2", // PEDAL
};

export type VisionStatus = "idle" | "connecting" | "connected" | "closed" | "error";

/**
 * Drives the full body-drum pipeline on a webcam: streams frames to the Python
 * backend over WebSocket, draws the pose overlay (skeleton + keypoints + zone
 * capsules at their true hit width) on `overlayRef`, and plays the matching
 * drum (with the global name flash) on every hit.
 *
 * Attach the three refs to a <video>, an overlay <canvas>, and a hidden <canvas>.
 */
export function useVisionPipeline() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const sendCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);

  const debugRef = useRef<VisionDebug>({});
  const flashRef = useRef<Map<DrumZone, number>>(new Map());

  const [status, setStatus] = useState<VisionStatus>("idle");
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
      // Unlock + preload the drum samples inside the user gesture.
      await DrumPlayer.init();

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
            DrumPlayer.play(ZONE_TO_DRUM[event.zone], Math.min(1, Math.max(0.3, event.velocity / 80)));
            window.dispatchEvent(
              new CustomEvent<VisionEvent>(VISION_HIT_EVENT, { detail: event }),
            );
          }
        }
      };

      ws.onerror = () => {
        setStatus("error");
        setError(`No se pudo conectar al backend de visión en ${VISION_WS_URL}`);
      };
      ws.onclose = () => setStatus("closed");
    } catch (err) {
      setStatus("error");
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Permiso denegado. Habilita la cámara en tu navegador.");
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setError("No se ha encontrado ninguna cámara en este dispositivo.");
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }, [sendFrame]);

  // Draw the pose overlay while running, on its own requestAnimationFrame loop.
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
      // True hit-box width in display px (diameter = 2 * radius).
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

      // Zone capsules at the TRUE hit width — what you see is what triggers.
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

  // Clean up on unmount.
  useEffect(() => stop, [stop]);

  return {
    videoRef,
    overlayRef,
    sendCanvasRef,
    start,
    stop,
    status,
    running,
    error,
    personDetected,
    fps,
    device,
    lastEvent,
    hitCount,
  };
}
