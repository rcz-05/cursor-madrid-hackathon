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

/** Friendly names accepted by `DrumPlayer.play()` (e.g. `feet_right` → `feet_2`). */
export const DRUM_ALIASES = {
  feet_left: "feet_1",
  feet_right: "feet_2",
  kick: "feet_1",
  hat_pedal: "feet_2",
  snare: "arm_left_low",
  hihat: "arm_left_high",
  tom_low: "arm_right_low",
  crash: "arm_right_high",
  arm_right_top: "arm_right_high",
} as const satisfies Record<string, DrumCode>;

export type DrumAlias = keyof typeof DRUM_ALIASES;

export type DrumInput = DrumCode | DrumAlias;

/** Ergonomic constants: `DrumPlayer.play(Drum.feet_right)`. */
export const Drum = {
  ...Object.fromEntries(DRUM_CODES.map((c) => [c, c])),
  ...DRUM_ALIASES,
} as Record<DrumCode | DrumAlias, DrumCode>;

export function resolveDrumCode(value: string): DrumCode | null {
  if (isDrumCode(value)) return value;
  if (value in DRUM_ALIASES) {
    return DRUM_ALIASES[value as DrumAlias];
  }
  return null;
}
