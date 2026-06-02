"use client";

import {
  CHART_DURATION_MS,
  COUNT_IN_MS,
  DEMO_BPM,
  DEMO_CHART,
} from "@/lib/drum-hero/chart";
import { DrumHeroEngine, type JudgedNote } from "@/lib/drum-hero/engine";
import { codeFromKey, PAD_KEYS } from "@/lib/drum-hero/pad-keys";
import {
  GRADE_LABEL,
  GRADE_POINTS,
  scoreFromResults,
  TIMING_WINDOWS,
  type HitGrade,
} from "@/lib/drum-hero/scoring";
import { DRUM_HIT_COLORS } from "@/lib/drum-hit-display";
import { DRUM_LABELS, type DrumCode } from "@/lib/drum-codes";
import { DrumPlayer } from "@/lib/drum-player";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const LANE_ORDER: DrumCode[] = [
  "feet_1",
  "feet_2",
  "arm_left_low",
  "arm_left_high",
  "arm_right_low",
  "arm_right_high",
];

const LANE_SHORT: Record<DrumCode, string> = {
  feet_1: "KICK",
  feet_2: "PED",
  arm_left_low: "SNR",
  arm_left_high: "HH",
  arm_right_low: "TOM",
  arm_right_high: "CRS",
};

type FlashGrade = {
  id: number;
  grade: HitGrade;
};

type DrumHeroProps = {
  /** Full-screen transparent overlay for camera compositing. */
  overlay?: boolean;
};

export function DrumHero({ overlay = true }: DrumHeroProps) {
  const engineRef = useRef(
    new DrumHeroEngine(DEMO_CHART, COUNT_IN_MS, CHART_DURATION_MS),
  );
  const rafRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState(engineRef.current.phase);
  const [countBeat, setCountBeat] = useState<number | null>(null);
  const [visibleNotes, setVisibleNotes] = useState(
    engineRef.current.visibleNotes(performance.now()),
  );
  const [combo, setCombo] = useState(0);
  const [lastHit, setLastHit] = useState<JudgedNote | null>(null);
  const [flash, setFlash] = useState<FlashGrade | null>(null);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const flashIdRef = useRef(0);

  const unlock = useCallback(async () => {
    setLoading(true);
    const player = await DrumPlayer.init();
    setReady(player.ready);
    setLoading(false);
  }, []);

  const showFlash = useCallback((grade: HitGrade) => {
    const id = ++flashIdRef.current;
    setFlash({ id, grade });
    window.setTimeout(() => {
      setFlash((current) => (current?.id === id ? null : current));
    }, 300);
  }, []);

  const processHit = useCallback(
    (code: DrumCode) => {
      if (!ready) return;
      DrumPlayer.play(code);

      const engine = engineRef.current;
      if (engine.phase !== "playing") return;

      const result = engine.registerHit(code, performance.now());
      if (!result) return;

      setLastHit(result);
      setCombo(engine.combo());
      showFlash(result.grade);
    },
    [ready, showFlash],
  );

  const tick = useCallback(() => {
    const engine = engineRef.current;
    const now = performance.now();
    engine.tick(now);

    setPhase(engine.phase);
    setCountBeat(engine.countInBeat(now));
    setVisibleNotes(engine.visibleNotes(now));
    setCombo(engine.combo());

    if (engine.phase === "finished" && finalScore === null) {
      const grades = engine.results.map((r) => r.grade);
      setFinalScore(scoreFromResults(grades));
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [finalScore]);

  const startGame = useCallback(() => {
    const engine = engineRef.current;
    engine.reset();
    engine.start(performance.now());
    setFinalScore(null);
    setLastHit(null);
    setCombo(0);
    setPhase("countdown");
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  useEffect(() => {
    if (!ready) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const code = codeFromKey(e.key);
      if (code) {
        e.preventDefault();
        processHit(code);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ready, processHit]);

  const stats = useMemo(() => {
    const results = engineRef.current.results;
    const perfect = results.filter((r) => r.grade === "perfect").length;
    const good = results.filter((r) => r.grade === "good").length;
    const miss = results.filter((r) => r.grade === "miss").length;
    return { perfect, good, miss, total: results.length };
  }, [phase, finalScore, lastHit]);

  const rootClass = overlay
    ? "pointer-events-none fixed inset-0 z-40 flex flex-col bg-transparent"
    : "drum-hero mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8";

  return (
    <div className={rootClass}>
      {/* HUD */}
      <div
        className={`flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-6 ${
          overlay ? "pointer-events-auto" : ""
        }`}
      >
        <div className="text-left">
          <p className="drum-hero-overlay-text font-mono text-[10px] uppercase tracking-widest text-white/70">
            Combo
          </p>
          <p className="drum-hero-overlay-text text-2xl font-black tabular-nums text-amber-300">
            {combo > 1 ? `${combo}x` : "—"}
          </p>
        </div>

        {!ready ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => void unlock()}
            className="pointer-events-auto rounded-lg border border-white/20 bg-black/30 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white backdrop-blur-[2px] transition-[background-color,transform] duration-150 ease hover:bg-black/45 active:scale-[0.97] disabled:opacity-60 drum-hero-overlay-text"
          >
            {loading ? "Loading…" : "Enable audio"}
          </button>
        ) : phase === "idle" || phase === "finished" ? (
          <button
            type="button"
            onClick={startGame}
            className="pointer-events-auto rounded-lg border border-amber-400/50 bg-black/30 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-amber-300 backdrop-blur-[2px] transition-[background-color,transform] duration-150 ease hover:bg-black/45 active:scale-[0.97] drum-hero-overlay-text"
          >
            {phase === "finished" ? "Play again" : "Start"}
          </button>
        ) : (
          <div className="text-center">
            <p className="drum-hero-overlay-text font-mono text-[10px] uppercase tracking-widest text-white/60">
              {phase === "countdown" ? "Get ready" : `${DEMO_BPM} bpm`}
            </p>
            <p className="drum-hero-overlay-text text-sm font-bold uppercase text-white">
              {phase === "countdown" ? "…" : "Playing"}
            </p>
          </div>
        )}

        <div className="text-right">
          <p className="drum-hero-overlay-text font-mono text-[10px] uppercase tracking-widest text-white/60">
            Last
          </p>
          <p
            className={`drum-hero-overlay-text text-sm font-bold uppercase ${
              lastHit?.grade === "perfect"
                ? "text-emerald-300"
                : lastHit?.grade === "good"
                  ? "text-amber-300"
                  : lastHit?.grade === "miss"
                    ? "text-red-400"
                    : "text-white/50"
            }`}
          >
            {lastHit ? GRADE_LABEL[lastHit.grade] : "—"}
          </p>
        </div>
      </div>

      {ready && (
        <>
          {/* Lanes — transparent, shadowed elements only */}
          <div
            className={`relative min-h-0 flex-1 ${
              overlay ? "pointer-events-auto" : "overflow-hidden rounded-2xl border border-zinc-800"
            }`}
          >
            {phase === "countdown" && countBeat !== null && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                <span
                  key={countBeat}
                  className="drum-hero-count drum-hero-overlay-text text-[clamp(5rem,18vw,10rem)] font-black tabular-nums text-amber-300"
                >
                  {countBeat}
                </span>
              </div>
            )}

            {flash && (
              <div
                key={flash.id}
                className={`drum-hero-flash drum-hero-overlay-text pointer-events-none absolute inset-x-0 top-[38%] z-20 text-center text-4xl font-black uppercase tracking-widest sm:text-5xl ${
                  flash.grade === "perfect"
                    ? "text-emerald-300"
                    : flash.grade === "good"
                      ? "text-amber-300"
                      : "text-red-400"
                }`}
              >
                {GRADE_LABEL[flash.grade]}
              </div>
            )}

            <div className="relative grid h-full grid-cols-6">
              {LANE_ORDER.map((code) => {
                const colors = DRUM_HIT_COLORS[code];
                const laneNotes = visibleNotes.filter(
                  (vn) => vn.note.code === code,
                );

                return (
                  <div
                    key={code}
                    className="drum-hero-overlay-lane relative border-r border-white/10 last:border-r-0"
                  >
                    <div className="absolute inset-x-0 top-0 h-7 text-center sm:h-8">
                      <span
                        className="drum-hero-overlay-text inline-block pt-1 font-mono text-[9px] font-bold uppercase tracking-wide sm:text-[10px]"
                        style={{ color: colors.foreground }}
                      >
                        {LANE_SHORT[code]}
                      </span>
                    </div>

                        <div
                          className="drum-hero-overlay-line absolute inset-x-1 z-10 h-1 rounded-full sm:inset-x-2"
                          style={{
                            background: colors.foreground,
                            boxShadow: `0 0 12px ${colors.glow}`,
                          }}
                        />

                    {laneNotes.map((vn) => {
                      const judged = vn.state === "judged";
                      const pastHit = vn.progress > 1;
                      const passFade = pastHit
                        ? Math.max(0, 1 - (vn.progress - 1) * 3.5)
                        : 1;
                      const opacity =
                        judged && vn.grade === "miss"
                          ? 0.2 * passFade
                          : judged
                            ? 0.55 * passFade
                            : passFade;

                      return (
                        <div
                          key={vn.note.id}
                          className="drum-hero-overlay-note absolute left-1/2 z-[5] w-[62%] max-w-7 -translate-x-1/2 rounded border-[1.5px] transition-opacity duration-100 ease-out"
                          style={
                            {
                              "--drum-hero-note-progress": vn.progress,
                              opacity,
                              backgroundColor: `color-mix(in oklch, ${colors.foreground} 34%, transparent)`,
                              borderColor: colors.foreground,
                              boxShadow:
                                judged || pastHit
                                  ? undefined
                                  : `0 0 14px ${colors.glow}`,
                            } as CSSProperties
                          }
                        />
                      );
                    })}

                    <button
                      type="button"
                      aria-label={DRUM_LABELS[code]}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        processHit(code);
                      }}
                      className="absolute inset-x-0 bottom-0 border-t border-white/15 bg-transparent transition-[background-color,transform] duration-100 ease active:scale-[0.97] active:bg-white/5"
                      style={{ height: "var(--drum-hero-hit-from-bottom)" }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {phase === "finished" && finalScore !== null && (
            <div
              className={`drum-hero-score-in shrink-0 px-4 py-4 text-center sm:px-6 ${
                overlay ? "pointer-events-auto" : ""
              }`}
            >
              <p className="drum-hero-overlay-text font-mono text-xs uppercase tracking-[0.3em] text-amber-300/90">
                Score
              </p>
              <p className="drum-hero-overlay-text mt-1 text-5xl font-black tabular-nums text-white sm:text-6xl">
                {finalScore}
                <span className="text-2xl text-white/50">%</span>
              </p>
              <div className="mt-3 flex justify-center gap-5 font-mono text-xs uppercase tracking-wide">
                <span className="drum-hero-overlay-text text-emerald-300">
                  {stats.perfect} perfect
                </span>
                <span className="drum-hero-overlay-text text-amber-300">
                  {stats.good} good
                </span>
                <span className="drum-hero-overlay-text text-red-400">
                  {stats.miss} miss
                </span>
              </div>
              <p className="drum-hero-overlay-text mt-2 font-mono text-[10px] text-white/50">
                ±{TIMING_WINDOWS.perfect}ms perfect · ±{TIMING_WINDOWS.good}ms
                good
              </p>
            </div>
          )}

          {phase === "playing" && (
            <p className="drum-hero-overlay-text pointer-events-none shrink-0 pb-3 text-center font-mono text-[10px] uppercase tracking-widest text-white/40">
              {Object.values(PAD_KEYS).join(" ")} · +{GRADE_POINTS.perfect}{" "}
              perfect · +{GRADE_POINTS.good} good
            </p>
          )}
        </>
      )}
    </div>
  );
}
