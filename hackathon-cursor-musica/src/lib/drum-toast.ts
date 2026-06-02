import { emitDrumHit } from "./drum-hit-bus";
import type { DrumCode } from "./drum-codes";

/** Flash the sector overlay for this pad (replaces Sonner toast). */
export function showDrumToast(code: DrumCode): void {
  emitDrumHit(code);
}
