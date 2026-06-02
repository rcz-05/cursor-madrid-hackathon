"use client";

import { GuitarHeroNotes } from "@/components/guitar-hero-notes";
import { DrumPlayer } from "@/lib/drum-player";
import { useCallback, useEffect, useRef, useState } from "react";

type CameraState = "idle" | "loading" | "active" | "error";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<CameraState>("idle");
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setState("idle");
  }, []);

  // Libera la cámara al desmontar.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const requestCamera = useCallback(async () => {
    setError(null);
    setState("loading");

    // Desbloquea el audio aprovechando el gesto del usuario (clic).
    void DrumPlayer.init().catch(() => {});

    if (!navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setError("Tu navegador no soporta el acceso a la cámara.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      streamRef.current = stream;
      setState("active");
    } catch (err) {
      setState("error");
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Permiso denegado. Habilita la cámara en tu navegador.");
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setError("No se ha encontrado ninguna cámara en este dispositivo.");
      } else {
        setError("No se ha podido acceder a la cámara.");
      }
    }
  }, []);

  // Asigna el stream al <video> cuando se monta la vista a pantalla completa.
  useEffect(() => {
    if (state === "active" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [state]);

  // Vista en directo casi a pantalla completa.
  if (state === "active") {
    return (
      <main className="fixed inset-3 flex flex-col overflow-hidden bg-amber-100 sm:inset-5">
        <div className="cartoon-lg relative flex flex-1 items-center justify-center overflow-hidden rounded-3xl bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          <GuitarHeroNotes enabled={state === "active"} />
          <span className="cartoon absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-extrabold text-white">
            <span className="h-3 w-3 animate-pulse rounded-full bg-white" />
            EN DIRECTO
          </span>
          <button
            onClick={stopCamera}
            className="cartoon-btn absolute right-4 top-4 z-20 rounded-full bg-yellow-300 px-5 py-2 text-sm font-extrabold text-black"
          >
            ✕ Apagar cámara
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 bg-amber-100 px-6 py-16">
      <header className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          📸 Cámara Cartoon
        </h1>
        <p className="mt-3 max-w-md text-lg font-medium text-black/70">
          Dale al botón, acepta el permiso y verás la cámara del ordenador a
          pantalla completa.
        </p>
      </header>

      <button
        onClick={requestCamera}
        disabled={state === "loading"}
        className="cartoon-btn rounded-2xl bg-yellow-300 px-10 py-5 text-2xl font-extrabold text-black disabled:opacity-60"
      >
        {state === "loading" ? "Pidiendo permiso…" : "🎥 Dar acceso a la cámara"}
      </button>

      {state === "error" && (
        <p className="max-w-sm text-center text-lg font-bold text-red-600">
          {error}
        </p>
      )}
    </main>
  );
}
