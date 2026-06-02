import { VisionStage } from "@/components/vision-stage";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Camera mode — Cursor Música",
  description: "Body-drum: pose-tracked hits trigger the e-drum kit",
};

export default function VisionPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <nav className="border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          ← Home
        </Link>
      </nav>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-10">
        <header className="space-y-2 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
            Camera mode
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Body Drum</h1>
          <p className="text-sm text-zinc-500">
            Strike a limb with the opposite hand. Each hit plays its drum and
            flashes the sound name on screen.
          </p>
        </header>

        <VisionStage />

        <p className="text-center text-xs text-zinc-400">
          Needs the Python vision backend running on <code>:8000</code>.
        </p>
      </main>
    </div>
  );
}
