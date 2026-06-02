"use client";

import { DrumHitOverlay } from "@/components/drum-hit-overlay";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      <DrumHitOverlay />
      <Toaster />
    </ThemeProvider>
  );
}
