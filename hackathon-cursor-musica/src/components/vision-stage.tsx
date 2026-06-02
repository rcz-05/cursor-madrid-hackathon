"use client";

import { VisionClient } from "@/components/vision-client";
import type { DrumCode } from "@/lib/drum-codes";
import { DrumPlayer } from "@/lib/drum-player";
import type { DrumZone, VisionEvent } from "@/lib/vision";
import { useCallback } from "react";

// Map each body zone to one of the six drum codes. Left/right arms map to the
// left/right arm pads; legs map to the two foot codes. DrumPlayer.play() also
// fires the global on-screen sound-name overlay (KICK / SNARE / HI-HAT …).
const ZONE_TO_DRUM: Record<DrumZone, DrumCode> = {
  upper_left_arm: "arm_left_high", // HI-HAT
  lower_left_arm: "arm_left_low", // SNARE
  upper_right_arm: "arm_right_high", // CRASH
  lower_right_arm: "arm_right_low", // LOW TOM
  left_leg: "feet_1", // KICK
  right_leg: "feet_2", // PEDAL
};

export function VisionStage() {
  const handleStart = useCallback(async () => {
    // Unlock + preload the drum samples inside the user gesture.
    await DrumPlayer.init();
  }, []);

  const handleHit = useCallback((event: VisionEvent) => {
    const code = ZONE_TO_DRUM[event.zone];
    // Scale the wrist velocity into a 0.3..1 gain.
    const gain = Math.min(1, Math.max(0.3, event.velocity / 80));
    DrumPlayer.play(code, gain);
  }, []);

  return <VisionClient onStart={handleStart} onHit={handleHit} />;
}
