import { DrumHero } from "@/components/drum-hero";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Drum Hero — Cursor Música",
  description: "Guitar Hero-style rhythm overlay for e-drums",
};

/**
 * Transparent full-screen overlay — place camera/video behind this route
 * (lower z-index, same viewport). Drum Hero UI has no opaque background.
 */
export default function DrumHeroPage() {
  return (
    <div className="fixed inset-0 bg-transparent">
      <DrumHero overlay />
    </div>
  );
}
