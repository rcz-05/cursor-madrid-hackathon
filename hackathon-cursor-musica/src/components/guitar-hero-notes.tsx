"use client";

import type { DrumCode } from "@/lib/drum-codes";
import {
  DRUM_DISPLAY_NAMES,
  DRUM_HIT_COLORS,
} from "@/lib/drum-hit-display";
import { subscribeDrumHits } from "@/lib/drum-hit-bus";
import {
  accuracyPercent,
  applyHit,
  applyMiss,
  findNoteForHit,
  INITIAL_GUITAR_HERO_STATS,
  JUDGMENT_LABELS,
  laneForDrumCode,
  type ActiveNote,
  type GuitarHeroStats,
  type HitJudgment,
  HIT_AT_RATIO,
} from "@/lib/guitar-hero-scoring";
import { useCallback, useEffect, useRef, useState } from "react";

/** One lane per drum sound, left-to-right like the on-screen kit layout. */
const LANE_ORDER: DrumCode[] = [
  "arm_left_high",
  "arm_left_low",
  "feet_1",
  "arm_right_high",
  "arm_right_low",
  "feet_2",
];

const LANES = LANE_ORDER.map((code) => ({
  code,
  color: DRUM_HIT_COLORS[code].foreground,
  glow: DRUM_HIT_COLORS[code].glow,
  label: DRUM_DISPLAY_NAMES[code],
}));

const FALL_MS = 4500;
const HIT_AT_MS = FALL_MS * HIT_AT_RATIO;
const SPAWN_MIN_MS = 900;
const SPAWN_MAX_MS = 1700;
const JUDGMENT_FLASH_MS = 900;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

type Props = {
  enabled: boolean;
  onStatsChange?: (stats: GuitarHeroStats) => void;
};

export function GuitarHeroNotes({ enabled, onStatsChange }: Props) {
  const [notes, setNotes] = useState<ActiveNote[]>([]);
  const [stats, setStats] = useState<GuitarHeroStats>(INITIAL_GUITAR_HERO_STATS);
  const [judgmentFlash, setJudgmentFlash] = useState<HitJudgment | null>(null);

  const idRef = useRef(0);
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const landTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const judgmentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesRef = useRef<ActiveNote[]>([]);
  const statsRef = useRef<GuitarHeroStats>(INITIAL_GUITAR_HERO_STATS);

  const updateStats = useCallback(
    (next: GuitarHeroStats) => {
      statsRef.current = next;
      setStats(next);
      onStatsChange?.(next);
    },
    [onStatsChange],
  );

  const flashJudgment = useCallback((judgment: HitJudgment) => {
    setJudgmentFlash(judgment);
    if (judgmentTimerRef.current) clearTimeout(judgmentTimerRef.current);
    judgmentTimerRef.current = setTimeout(() => {
      setJudgmentFlash(null);
      judgmentTimerRef.current = null;
    }, JUDGMENT_FLASH_MS);
  }, []);

  const resolveNote = useCallback(
    (noteId: number, judgment: HitJudgment) => {
      const landTimer = landTimersRef.current.get(noteId);
      if (landTimer) {
        clearTimeout(landTimer);
        landTimersRef.current.delete(noteId);
      }

      setNotes((prev) => {
        const next = prev.map((note) =>
          note.id === noteId ? { ...note, resolved: true } : note,
        );
        notesRef.current = next;
        return next;
      });

      setTimeout(() => {
        setNotes((prev) => {
          const next = prev.filter((note) => note.id !== noteId);
          notesRef.current = next;
          return next;
        });
      }, 120);

      flashJudgment(judgment);
    },
    [flashJudgment],
  );

  const registerMiss = useCallback(
    (noteId: number) => {
      const note = notesRef.current.find((n) => n.id === noteId);
      if (!note || note.resolved) return;

      landTimersRef.current.delete(noteId);
      updateStats(applyMiss(statsRef.current));
      resolveNote(noteId, "miss");
    },
    [resolveNote, updateStats],
  );

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    if (!enabled) return;

    const landTimers = landTimersRef.current;

    const spawn = () => {
      const id = ++idRef.current;
      const lane = Math.floor(Math.random() * LANES.length);
      const spawnAt = performance.now();
      const note: ActiveNote = {
        id,
        lane,
        code: LANE_ORDER[lane]!,
        spawnAt,
        resolved: false,
      };

      setNotes((prev) => {
        const next = [...prev, note];
        notesRef.current = next;
        return next;
      });

      const landTimer = setTimeout(() => {
        landTimers.delete(id);
        registerMiss(id);
      }, FALL_MS);
      landTimers.set(id, landTimer);

      spawnTimerRef.current = setTimeout(
        spawn,
        randomBetween(SPAWN_MIN_MS, SPAWN_MAX_MS),
      );
    };

    spawnTimerRef.current = setTimeout(spawn, 400);

    return () => {
      if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
      for (const t of landTimers.values()) clearTimeout(t);
      landTimers.clear();
      if (judgmentTimerRef.current) clearTimeout(judgmentTimerRef.current);
      setNotes([]);
      notesRef.current = [];
      updateStats(INITIAL_GUITAR_HERO_STATS);
      setJudgmentFlash(null);
    };
  }, [enabled, registerMiss, updateStats]);

  useEffect(() => {
    if (!enabled) return;

    return subscribeDrumHits((code) => {
      const lane = laneForDrumCode(code, LANE_ORDER);
      if (lane < 0) return;

      const now = performance.now();
      const match = findNoteForHit(notesRef.current, lane, now, HIT_AT_MS);
      if (!match) return;

      updateStats(applyHit(statsRef.current, match.judgment));
      resolveNote(match.note.id, match.judgment);
    });
  }, [enabled, resolveNote, updateStats]);

  if (!enabled) return null;

  const accuracy = accuracyPercent(stats);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[58%] overflow-hidden"
      style={{ perspective: "720px", perspectiveOrigin: "50% 25%" }}
    >
      {/* Score HUD */}
      <div className="absolute inset-x-0 top-3 z-20 flex items-start justify-between px-4">
        <div className="cartoon rounded-2xl bg-black/75 px-4 py-2 text-left">
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-white/60">
            Puntuación
          </p>
          <p className="text-3xl font-extrabold tabular-nums text-yellow-300">
            {stats.score.toLocaleString()}
          </p>
        </div>

        <div className="flex flex-col items-center gap-1">
          {judgmentFlash && (
            <p
              className={`cartoon rounded-full px-5 py-1.5 text-lg font-extrabold uppercase tracking-wide ${
                judgmentFlash === "perfect"
                  ? "bg-lime-300 text-black"
                  : judgmentFlash === "good"
                    ? "bg-sky-300 text-black"
                    : "bg-red-400 text-white"
              }`}
            >
              {JUDGMENT_LABELS[judgmentFlash]}
            </p>
          )}
        </div>

        <div className="cartoon rounded-2xl bg-black/75 px-4 py-2 text-right">
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-white/60">
            Combo
          </p>
          <p className="text-3xl font-extrabold tabular-nums text-orange-400">
            {stats.combo}
            <span className="ml-1 text-base text-white/50">×</span>
          </p>
          <p className="text-xs font-bold text-white/50">
            {accuracy}% · max {stats.maxCombo}
          </p>
        </div>
      </div>

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
            className={`guitar-note cartoon absolute left-0 top-1/2 flex items-center justify-center rounded-full ${
              note.resolved ? "guitar-note-hit" : ""
            }`}
            style={
              {
                left: `${leftPct}%`,
                width: "4.5rem",
                height: "4.5rem",
                backgroundColor: lane.color,
                boxShadow: `5px 5px 0 0 #1a1a1a, 0 0 36px ${lane.glow}`,
                fontSize: "0.72rem",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                color: "#1a1a1a",
                "--fall-ms": `${FALL_MS}ms`,
              } as React.CSSProperties
            }
          >
            {lane.label}
          </div>
        );
      })}

      {/* Línea de golpeo cartoon (zona de llegada, arriba) */}
      <div className="absolute inset-x-0 top-[12%] flex items-center">
        <div className="h-2 flex-1 bg-[#1a1a1a]" />
        <div className="flex gap-[6%] px-[3%]">
          {LANES.map((lane, i) => (
            <span
              key={i}
              className="cartoon block h-11 w-11 rounded-full"
              style={{ backgroundColor: lane.color }}
            />
          ))}
        </div>
        <div className="h-2 flex-1 bg-[#1a1a1a]" />
      </div>
    </div>
  );
}
