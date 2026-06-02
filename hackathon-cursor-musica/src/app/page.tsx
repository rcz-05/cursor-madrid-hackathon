import { DrumKit } from "@/components/drum-kit";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <nav className="absolute right-4 top-4 flex gap-4 text-sm text-zinc-500">
        <Link href="/vision" className="transition hover:text-zinc-900 dark:hover:text-zinc-200">
          Camera mode →
        </Link>
        <Link href="/music-test" className="transition hover:text-zinc-900 dark:hover:text-zinc-200">
          Music test
        </Link>
      </nav>
      <DrumKit />
    </div>
  );
}
