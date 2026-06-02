export type HitGrade = "perfect" | "good" | "miss";

export const TIMING_WINDOWS = {
  perfect: 220,
  good: 450,
} as const;

/** Grace period after the hit window before auto-miss. */
export const MISS_GRACE_MS = TIMING_WINDOWS.good + 150;

export const GRADE_POINTS: Record<HitGrade, number> = {
  perfect: 100,
  good: 50,
  miss: 0,
};

export function gradeForDeltaMs(absDeltaMs: number): HitGrade {
  if (absDeltaMs <= TIMING_WINDOWS.perfect) return "perfect";
  if (absDeltaMs <= TIMING_WINDOWS.good) return "good";
  return "miss";
}

export function scoreFromResults(grades: HitGrade[]): number {
  if (grades.length === 0) return 0;
  const total = grades.reduce((sum, g) => sum + GRADE_POINTS[g], 0);
  const max = grades.length * GRADE_POINTS.perfect;
  return Math.round((total / max) * 100);
}

export const GRADE_LABEL: Record<HitGrade, string> = {
  perfect: "Perfect",
  good: "Good",
  miss: "Miss",
};
