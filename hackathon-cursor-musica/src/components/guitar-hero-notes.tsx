"use client";

import { DrumPlayer } from "@/lib/drum-player";
import { emitDrumHit } from "@/lib/drum-hit-bus";
import { useEffect, useRef, useState } from "react";

/** Carriles estilo Guitar Hero, con su color cartoon. */
const LANES = [
  { color: "#22c55e", glow: "rgba(34,197,94,0.7)" }, // verde
  { color: "#ef4444", glow: "rgba(239,68,68,0.7)" }, // rojo
  { color: "#facc15", glow: "rgba(250,204,21,0.7)" }, // amarillo
  { color: "#3b82f6", glow: "rgba(59,130,246,0.7)" }, // azul
  { color: "#f97316", glow: "rgba(249,115,22,0.7)" }, // naranja
] as const;

const NOTE_GLYPHS = ["♪", "♫", "♬", "🎵", "🎶"] as const;

const FALL_MS = 2800;
const SPAWN_MIN_MS = 600;
const SPAWN_MAX_MS = 1100;
/** Probabilidad de que una nota sea la "meme" que suena. */
const MEME_CHANCE = 0.18;

type Note = {
  id: number;
  lane: number;
  glyph: string;
  meme: boolean;
};

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function GuitarHeroNotes({ enabled }: { enabled: boolean }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [lineFlash, setLineFlash] = useState(false);
  const idRef = useRef(0);
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const landTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    const landTimers = landTimersRef.current;

    const spawn = () => {
      const id = ++idRef.current;
      const lane = Math.floor(Math.random() * LANES.length);
      const meme = Math.random() < MEME_CHANCE;
      const glyph = meme
        ? "🔥"
        : NOTE_GLYPHS[Math.floor(Math.random() * NOTE_GLYPHS.length)]!;

      setNotes((prev) => [...prev, { id, lane, glyph, meme }]);

      // Al alcanzar la línea de golpeo: la nota meme suena y hace flashear todo.
      const landTimer = setTimeout(() => {
        landTimers.delete(landTimer);
        if (meme) {
          // `arm_right_high` dispara el pool de sonidos meme.
          try {
            DrumPlayer.play("arm_right_high");
          } catch {
            // El audio aún no está desbloqueado; se ignora.
          }
          emitDrumHit("arm_right_high");
          setLineFlash(true);
          setTimeout(() => setLineFlash(false), 220);
        }
        setNotes((prev) => prev.filter((n) => n.id !== id));
      }, FALL_MS);
      landTimers.add(landTimer);

      spawnTimerRef.current = setTimeout(
        spawn,
        randomBetween(SPAWN_MIN_MS, SPAWN_MAX_MS),
      );
    };

    spawnTimerRef.current = setTimeout(spawn, 400);

    return () => {
      if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
      for (const t of landTimers) clearTimeout(t);
      landTimers.clear();
      setNotes([]);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[58%] overflow-hidden"
      style={{ perspective: "720px", perspectiveOrigin: "50% 25%" }}
    >
      {/* Suelo/autopista inclinado que se aleja hacia el horizonte */}
      <div
        className="absolute inset-x-0 bottom-0 h-[130%]"
        style={{
          transform: "rotateX(60deg)",
          transformOrigin: "bottom center",
        }}
      >
        {/* Carriles que convergen */}
        <div className="flex h-full w-full">
          {LANES.map((lane, i) => (
            <div
              key={i}
              className="h-full flex-1 border-x-2 border-white/15"
              style={{
                background: `linear-gradient(to top, ${lane.glow} -10%, transparent 55%)`,
                opacity: 0.35,
              }}
            />
          ))}
        </div>
        {/* Travesaños horizontales para dar sensación de velocidad */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to top, rgba(255,255,255,0.18) 0 2px, transparent 2px 14%)",
          }}
        />
      </div>

      {/* Notas viniendo hacia ti */}
      {notes.map((note) => {
        const lane = LANES[note.lane]!;
        const leftPct = ((note.lane + 0.5) / LANES.length) * 100;
        return (
          <div
            key={note.id}
            className="guitar-note cartoon absolute left-0 top-1/2 flex items-center justify-center rounded-full"
            style={
              {
                left: `${leftPct}%`,
                width: note.meme ? "4.5rem" : "3.5rem",
                height: note.meme ? "4.5rem" : "3.5rem",
                backgroundColor: note.meme ? "#fff" : lane.color,
                boxShadow: `6px 6px 0 0 #1a1a1a, 0 0 32px ${lane.glow}`,
                fontSize: note.meme ? "2.3rem" : "1.75rem",
                "--fall-ms": `${FALL_MS}ms`,
              } as React.CSSProperties
            }
          >
            {note.glyph}
          </div>
        );
      })}

      {/* Línea de golpeo cartoon (zona de llegada, arriba) */}
      <div
        className="absolute inset-x-0 top-[12%] flex items-center"
        style={{
          animation: lineFlash ? "guitar-line-flash 220ms ease-in-out" : undefined,
        }}
      >
        <div className="h-2 flex-1 bg-[#1a1a1a]" />
        <div className="flex gap-[6%] px-[3%]">
          {LANES.map((lane, i) => (
            <span
              key={i}
              className="cartoon block h-7 w-7 rounded-full"
              style={{ backgroundColor: lane.color }}
            />
          ))}
        </div>
        <div className="h-2 flex-1 bg-[#1a1a1a]" />
      </div>
    </div>
  );
}
