import type { DrumCode } from "./drum-codes";

type DrumHitListener = (code: DrumCode) => void;

const listeners = new Set<DrumHitListener>();

export function subscribeDrumHits(listener: DrumHitListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitDrumHit(code: DrumCode): void {
  for (const listener of listeners) {
    listener(code);
  }
}
