import type { DrumCode } from "@/lib/drum-codes";

export type ChartNote = {
  id: string;
  /** Milliseconds from song start (after count-in). */
  timeMs: number;
  code: DrumCode;
};

/** BPM for the demo chart — slow beginner tempo. */
export const DEMO_BPM = 52;

const BEAT_MS = 60_000 / DEMO_BPM;

/** Three-beat count-in before the first note. */
export const COUNT_IN_MS = BEAT_MS * 3;

/** How long before hit time a note appears on screen (slow fall). */
export const NOTE_LEAD_MS = 5_500;

/** Keep rendering notes after the hit line until they exit the lane. */
export const NOTE_PASS_THROUGH_MS = 650;

function beat(n: number, code: DrumCode): ChartNote {
  return { id: `${n}-${code}`, timeMs: Math.round(n * BEAT_MS), code };
}

/** Simple groove — mostly whole beats, easy to follow over camera. */
export const DEMO_CHART: ChartNote[] = [
  beat(0, "feet_1"),
  beat(2, "arm_left_low"),
  beat(4, "feet_1"),
  beat(4, "arm_left_high"),
  beat(6, "arm_left_low"),
  beat(8, "feet_1"),
  beat(8, "arm_left_high"),
  beat(10, "arm_left_low"),
  beat(12, "feet_1"),
  beat(12, "arm_right_high"),
  beat(14, "arm_left_low"),
  beat(16, "feet_1"),
  beat(16, "arm_left_high"),
  beat(18, "arm_left_low"),
  beat(20, "feet_1"),
];

export const CHART_DURATION_MS =
  DEMO_CHART[DEMO_CHART.length - 1]!.timeMs + BEAT_MS * 2;
