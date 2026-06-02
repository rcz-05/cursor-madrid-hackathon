import { DrumKit } from "@/components/drum-kit";
import { DRUM_CODES } from "@/lib/drum-codes";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Music test — Cursor Música",
  description: "Test e-drum pads and WAV samples",
};

export default function MusicTestPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 text-black">
      <nav className="border-b border-zinc-200 px-6 py-3">
        <Link
          href="/"
          className="text-sm text-zinc-600 transition hover:text-black"
        >
          ← Home
        </Link>
      </nav>

      <DrumKit
        title="Music test"
        subtitle="Pads and keyboard (1 2 q w e r)"
      />

      <section className="mx-auto w-full max-w-lg px-6 pb-12">
        <h2 className="mb-3 text-sm font-medium text-zinc-700">
          Sample files
        </h2>
        <ul className="space-y-1 font-mono text-xs text-zinc-600">
          {DRUM_CODES.map((code) => (
            <li key={code}>
              <a
                href={`/samples/${code}.wav`}
                className="underline-offset-2 hover:underline"
              >
                /samples/{code}.wav
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
