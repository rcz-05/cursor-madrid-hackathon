"use client";

import {
  DRUM_CODES,
  DRUM_LABELS,
  type DrumCode,
} from "@/lib/drum-codes";
import { DrumPlayer } from "@/lib/drum-player";
import { useCallback, useEffect, useRef, useState } from "react";

const PAD_KEYS: Partial<Record<DrumCode, string>> = {
  feet_1: "1",
  feet_2: "2",
  arm_left_low: "q",
  arm_left_high: "w",
  arm_right_low: "e",
  arm_right_high: "r",
};

type DrumKitProps = {
  title?: string;
  subtitle?: string;
  apiTestAll?: boolean;
};

export function DrumKit({
  title = "Cursor Música",
  subtitle = "Six codes · WAV samples · POST /api/hit",
  apiTestAll = false,
}: DrumKitProps = {}) {
  const playerRef = useRef<DrumPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastHit, setLastHit] = useState<string | null>(null);
  const [apiLog, setApiLog] = useState<string | null>(null);

  const ensurePlayer = useCallback(() => {
    if (!playerRef.current) {
      playerRef.current = new DrumPlayer();
    }
    return playerRef.current;
  }, []);

  const unlock = useCallback(async () => {
    setLoading(true);
    const player = ensurePlayer();
    await player.unlock();
    setReady(player.ready);
    setLoading(false);
  }, [ensurePlayer]);

  const hit = useCallback(
    async (code: DrumCode, viaApi = false) => {
      if (!ready) return;
      const player = ensurePlayer();
      player.play(code);

      if (viaApi) {
        const res = await fetch("/api/hit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, velocity: 0.9 }),
        });
        const data = await res.json();
        setApiLog(
          res.ok
            ? `API ✓ ${data.label} (${data.code})`
            : `API ✗ ${data.error ?? res.status}`,
        );
      }

      setLastHit(`${DRUM_LABELS[code]} · ${code}`);
    },
    [ensurePlayer, ready],
  );

  useEffect(() => {
    if (!ready) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const code = DRUM_CODES.find((c) => PAD_KEYS[c] === e.key);
      if (code) {
        e.preventDefault();
        void hit(code);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hit, ready]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-6 py-12">
      <header className="space-y-2 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          E-drum service
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-zinc-500">{subtitle}</p>
      </header>

      {!ready ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void unlock()}
          className="rounded-2xl bg-zinc-900 px-6 py-4 text-center text-lg font-medium text-white transition hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {loading ? "Loading samples…" : "Enable audio"}
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {DRUM_CODES.map((code) => (
            <button
              key={code}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                void hit(code);
              }}
              className="flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-2xl border border-zinc-200 bg-white px-3 py-4 text-center shadow-sm transition active:scale-[0.97] active:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:active:bg-zinc-800"
            >
              <span className="text-lg font-semibold">{DRUM_LABELS[code]}</span>
              <span className="font-mono text-xs text-zinc-500">{code}</span>
              {PAD_KEYS[code] && (
                <span className="mt-1 rounded bg-zinc-100 px-1.5 font-mono text-[10px] text-zinc-400 dark:bg-zinc-800">
                  {PAD_KEYS[code]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {ready && apiTestAll && (
        <div className="space-y-2">
          <p className="text-center text-xs font-medium uppercase tracking-wide text-zinc-500">
            API test (play + POST)
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {DRUM_CODES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => void hit(code, true)}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 font-mono text-xs transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      )}

      {ready && !apiTestAll && (
        <button
          type="button"
          onClick={() => void hit("feet_1", true)}
          className="text-sm text-zinc-500 underline-offset-2 hover:underline"
        >
          Test API with kick (feet_1)
        </button>
      )}

      {lastHit && (
        <p className="text-center font-mono text-sm text-zinc-600 dark:text-zinc-400">
          Last: {lastHit}
        </p>
      )}
      {apiLog && (
        <p className="text-center font-mono text-xs text-emerald-600 dark:text-emerald-400">
          {apiLog}
        </p>
      )}
    </div>
  );
}
