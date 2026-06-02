"use client";

import {
  DRUM_DISPLAY_NAMES,
  DRUM_HIT_COLORS,
  DRUM_SECTOR,
  DRUM_SECTORS,
  SECTOR_CELL_CLASS,
  type DrumSector,
} from "@/lib/drum-hit-display";
import { subscribeDrumHits } from "@/lib/drum-hit-bus";
import type { DrumCode } from "@/lib/drum-codes";
import { Rock_Salt } from "next/font/google";
import { useCallback, useEffect, useRef, useState } from "react";

const rockSalt = Rock_Salt({
  weight: "400",
  subsets: ["latin"],
});

const HIT_VISIBLE_MS = 650;

type ActiveHit = {
  id: number;
  code: DrumCode;
};

export function DrumHitOverlay() {
  const [hitsBySector, setHitsBySector] = useState<
    Partial<Record<DrumSector, ActiveHit>>
  >({});
  const idRef = useRef(0);
  const timersRef = useRef<Map<DrumSector, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const flash = useCallback((code: DrumCode) => {
    const sector = DRUM_SECTOR[code];
    const id = ++idRef.current;

    const existing = timersRef.current.get(sector);
    if (existing) clearTimeout(existing);

    setHitsBySector((prev) => ({ ...prev, [sector]: { id, code } }));

    const timer = setTimeout(() => {
      timersRef.current.delete(sector);
      setHitsBySector((prev) => {
        if (prev[sector]?.id !== id) return prev;
        const next = { ...prev };
        delete next[sector];
        return next;
      });
    }, HIT_VISIBLE_MS);

    timersRef.current.set(sector, timer);
  }, []);

  useEffect(() => subscribeDrumHits(flash), [flash]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  return (
    <div
      className="drum-hit-overlay pointer-events-none fixed inset-0 z-50 grid grid-cols-2 grid-rows-3"
      aria-hidden
    >
      {DRUM_SECTORS.map((sector) => {
        const hit = hitsBySector[sector];
        const colors = hit ? DRUM_HIT_COLORS[hit.code] : null;

        return (
          <div
            key={sector}
            className={`flex ${SECTOR_CELL_CLASS[sector]}`}
          >
            {hit && colors && (
              <span
                key={hit.id}
                className={`drum-hit-label ${rockSalt.className} select-none text-center uppercase leading-[0.9] tracking-tight`}
                style={
                  {
                    color: colors.foreground,
                    textShadow: `0 0 40px ${colors.glow}, 0 2px 24px ${colors.glow}`,
                    fontSize: "clamp(2.5rem, 12vw, 6.5rem)",
                  } as React.CSSProperties
                }
              >
                {DRUM_DISPLAY_NAMES[hit.code]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
