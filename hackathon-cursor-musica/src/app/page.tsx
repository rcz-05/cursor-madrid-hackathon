"use client";

import { useVisionPipeline } from "@/hooks/use-vision-pipeline";

export default function Home() {
  const {
    videoRef,
    overlayRef,
    sendCanvasRef,
    start,
    stop,
    status,
    running,
    error,
    hitCount,
    fps,
  } = useVisionPipeline();
  const connecting = status === "connecting";

  return (
    <main className="fixed inset-3 flex items-center justify-center overflow-hidden bg-amber-100 sm:inset-5">
      <div className="relative aspect-[4/3] w-full max-w-3xl">
        <div className="cartoon-lg relative h-full w-full overflow-hidden rounded-3xl bg-black">
          {/* Mirror video + pose overlay together so coordinates stay aligned. */}
          <div className="absolute inset-0 -scale-x-100">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            <canvas ref={overlayRef} className="absolute inset-0 h-full w-full" />
          </div>

          {/* Live HUD (only while tracking). */}
          {running && (
            <>
              <span className="cartoon absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-extrabold text-white">
                <span className="h-3 w-3 animate-pulse rounded-full bg-white" />
                EN DIRECTO
              </span>
              <button
                onClick={stop}
                className="cartoon-btn absolute right-4 top-4 rounded-full bg-yellow-300 px-5 py-2 text-sm font-extrabold text-black"
              >
                ✕ Apagar cámara
              </button>
              <span className="cartoon absolute bottom-4 left-4 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-black">
                🥁 {hitCount} golpes · {fps} fps
              </span>
            </>
          )}

          {/* Cartoon landing overlay (covers the box until tracking starts). */}
          {!running && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 bg-amber-100 px-6 text-center">
              <header>
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                  🥁 Cámara Cartoon
                </h1>
                <p className="mx-auto mt-3 max-w-md text-lg font-medium text-black/70">
                  Dale al botón, acepta la cámara y golpea tus brazos y piernas
                  con la mano contraria para tocar la batería.
                </p>
              </header>

              <button
                onClick={() => void start()}
                disabled={connecting}
                className="cartoon-btn rounded-2xl bg-yellow-300 px-10 py-5 text-2xl font-extrabold text-black disabled:opacity-60"
              >
                {connecting ? "Conectando…" : "🎥 Dar acceso a la cámara"}
              </button>

              {error && (
                <p className="max-w-sm text-center text-lg font-bold text-red-600">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden scratch canvas used to encode frames before sending. */}
      <canvas ref={sendCanvasRef} className="hidden" />
    </main>
  );
}
