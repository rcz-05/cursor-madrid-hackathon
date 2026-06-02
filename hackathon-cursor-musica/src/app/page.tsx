import { DrumKit } from "@/components/drum-kit";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="mb-6 flex gap-3">
        <Link
          href="/drum-hero"
          className="rounded-full bg-amber-500 px-5 py-2 text-sm font-bold uppercase tracking-wide text-black transition hover:bg-amber-400"
        >
          Drum Hero →
        </Link>
        <Link
          href="/music-test"
          className="rounded-full border border-zinc-300 px-5 py-2 text-sm text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Music test
        </Link>
      </div>
      <DrumKit />
    </div>
  );
}
