import type { DrumCode } from "@/lib/drum-codes";

export const PAD_KEYS: Partial<Record<DrumCode, string>> = {
  feet_1: "1",
  feet_2: "2",
  arm_left_low: "q",
  arm_left_high: "w",
  arm_right_low: "e",
  arm_right_high: "r",
};

export function codeFromKey(key: string): DrumCode | undefined {
  return (Object.entries(PAD_KEYS) as [DrumCode, string][]).find(
    ([, k]) => k === key,
  )?.[0];
}
