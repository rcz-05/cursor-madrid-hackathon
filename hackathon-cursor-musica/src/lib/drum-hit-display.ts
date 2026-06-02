import type { DrumCode } from "./drum-codes";

/** Screen sectors — left column (arm + kick), right column (arm + pedal). */
export type DrumSector =
  | "left-top"
  | "left-mid"
  | "left-bottom"
  | "right-top"
  | "right-mid"
  | "right-bottom";

export const DRUM_SECTORS: DrumSector[] = [
  "left-top",
  "left-mid",
  "left-bottom",
  "right-top",
  "right-mid",
  "right-bottom",
];

/** Kit layout: high left arm → low left arm → kick; high right arm → low right arm → pedal. */
export const DRUM_SECTOR: Record<DrumCode, DrumSector> = {
  arm_left_high: "left-top",
  arm_left_low: "left-mid",
  feet_1: "left-bottom",
  arm_right_high: "right-top",
  arm_right_low: "right-mid",
  feet_2: "right-bottom",
};

/** Large on-screen labels shown on hit. */
export const DRUM_DISPLAY_NAMES: Record<DrumCode, string> = {
  feet_1: "KICK",
  feet_2: "PEDAL",
  arm_left_low: "SNARE",
  arm_left_high: "HI-HAT",
  arm_right_low: "LOW TOM",
  arm_right_high: "CRASH",
};

export const DRUM_HIT_COLORS: Record<
  DrumCode,
  { foreground: string; glow: string }
> = {
  feet_1: {
    foreground: "oklch(0.72 0.22 25)",
    glow: "oklch(0.52 0.2 25 / 0.45)",
  },
  feet_2: {
    foreground: "oklch(0.78 0.16 75)",
    glow: "oklch(0.58 0.14 75 / 0.45)",
  },
  arm_left_low: {
    foreground: "oklch(0.75 0.2 45)",
    glow: "oklch(0.55 0.19 45 / 0.45)",
  },
  arm_left_high: {
    foreground: "oklch(0.82 0.14 210)",
    glow: "oklch(0.62 0.12 210 / 0.45)",
  },
  arm_right_low: {
    foreground: "oklch(0.72 0.22 300)",
    glow: "oklch(0.52 0.2 300 / 0.45)",
  },
  arm_right_high: {
    foreground: "oklch(0.82 0.18 145)",
    glow: "oklch(0.72 0.16 145 / 0.45)",
  },
};

export const SECTOR_CELL_CLASS: Record<DrumSector, string> = {
  "left-top": "items-start justify-start pl-[clamp(1rem,6vw,3rem)] pt-[clamp(1rem,8vh,4rem)]",
  "left-mid":
    "items-center justify-start pl-[clamp(1rem,6vw,3rem)]",
  "left-bottom":
    "items-end justify-start pl-[clamp(1rem,6vw,3rem)] pb-[clamp(1rem,8vh,4rem)]",
  "right-top":
    "items-start justify-end pr-[clamp(1rem,6vw,3rem)] pt-[clamp(1rem,8vh,4rem)]",
  "right-mid":
    "items-center justify-end pr-[clamp(1rem,6vw,3rem)]",
  "right-bottom":
    "items-end justify-end pr-[clamp(1rem,6vw,3rem)] pb-[clamp(1rem,8vh,4rem)]",
};
