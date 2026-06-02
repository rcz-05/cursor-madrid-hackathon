import type { DrumCode } from "./drum-codes";

export type HitJudgment = "perfect" | "good" | "miss";

/** When a note reaches the strike line (fraction of fall duration). */
export const HIT_AT_RATIO = 0.85;

/** Timing windows around the strike moment (ms). */
export const PERFECT_WINDOW_MS = 180;
export const GOOD_WINDOW_MS = 400;

export const BASE_SCORE: Record<Exclude<HitJudgment, "miss">, number> = {
  perfect: 300,
  good: 100,
};

export type GuitarHeroStats = {
  score: number;
  combo: number;
  maxCombo: number;
  perfects: number;
  goods: number;
  misses: number;
  lastJudgment: HitJudgment | null;
};

export const INITIAL_GUITAR_HERO_STATS: GuitarHeroStats = {
  score: 0,
  combo: 0,
  maxCombo: 0,
  perfects: 0,
  goods: 0,
  misses: 0,
  lastJudgment: null,
};

export function getComboMultiplier(combo: number): number {
  if (combo >= 50) return 4;
  if (combo >= 25) return 3;
  if (combo >= 10) return 2;
  return 1;
}

export function judgeTiming(
  deltaMs: number,
): Exclude<HitJudgment, "miss"> | null {
  const abs = Math.abs(deltaMs);
  if (abs <= PERFECT_WINDOW_MS) return "perfect";
  if (abs <= GOOD_WINDOW_MS) return "good";
  return null;
}

export function scoreForJudgment(
  judgment: Exclude<HitJudgment, "miss">,
  combo: number,
): number {
  return BASE_SCORE[judgment] * getComboMultiplier(combo);
}

export function accuracyPercent(stats: GuitarHeroStats): number {
  const total = stats.perfects + stats.goods + stats.misses;
  if (total === 0) return 100;
  return Math.round(((stats.perfects + stats.goods) / total) * 100);
}

export type ActiveNote = {
  id: number;
  lane: number;
  code: DrumCode;
  spawnAt: number;
  resolved: boolean;
};

export function laneForDrumCode(
  code: DrumCode,
  laneOrder: readonly DrumCode[],
): number {
  return laneOrder.indexOf(code);
}

export function findNoteForHit(
  notes: ActiveNote[],
  lane: number,
  now: number,
  hitAtMs: number,
): { note: ActiveNote; judgment: Exclude<HitJudgment, "miss">; deltaMs: number } | null {
  let best: {
    note: ActiveNote;
    judgment: Exclude<HitJudgment, "miss">;
    deltaMs: number;
    absDelta: number;
  } | null = null;

  for (const note of notes) {
    if (note.resolved || note.lane !== lane) continue;

    const deltaMs = now - note.spawnAt - hitAtMs;
    const judgment = judgeTiming(deltaMs);
    if (!judgment) continue;

    const absDelta = Math.abs(deltaMs);
    if (!best || absDelta < best.absDelta) {
      best = { note, judgment, deltaMs, absDelta };
    }
  }

  return best
    ? { note: best.note, judgment: best.judgment, deltaMs: best.deltaMs }
    : null;
}

export function applyHit(
  stats: GuitarHeroStats,
  judgment: Exclude<HitJudgment, "miss">,
): GuitarHeroStats {
  const combo = stats.combo + 1;
  const points = scoreForJudgment(judgment, combo);

  return {
    score: stats.score + points,
    combo,
    maxCombo: Math.max(stats.maxCombo, combo),
    perfects: stats.perfects + (judgment === "perfect" ? 1 : 0),
    goods: stats.goods + (judgment === "good" ? 1 : 0),
    misses: stats.misses,
    lastJudgment: judgment,
  };
}

export function applyMiss(stats: GuitarHeroStats): GuitarHeroStats {
  return {
    ...stats,
    combo: 0,
    misses: stats.misses + 1,
    lastJudgment: "miss",
  };
}

export const JUDGMENT_LABELS: Record<HitJudgment, string> = {
  perfect: "PERFECT",
  good: "GOOD",
  miss: "MISS",
};
