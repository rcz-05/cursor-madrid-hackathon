export const DRUM_CODES = [
  "feet_1",
  "feet_2",
  "arm_left_low",
  "arm_left_high",
  "arm_right_low",
  "arm_right_high",
] as const;

export type DrumCode = (typeof DRUM_CODES)[number];

export const DRUM_LABELS: Record<DrumCode, string> = {
  feet_1: "Kick",
  feet_2: "Hi-hat pedal",
  arm_left_low: "Snare",
  arm_left_high: "Hi-hat",
  arm_right_low: "Low tom",
  arm_right_high: "Crash",
};

export function isDrumCode(value: string): value is DrumCode {
  return (DRUM_CODES as readonly string[]).includes(value);
}
