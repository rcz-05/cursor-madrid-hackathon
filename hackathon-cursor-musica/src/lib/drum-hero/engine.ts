import type { DrumCode } from "@/lib/drum-codes";
import type { ChartNote } from "./chart";
import { NOTE_LEAD_MS, NOTE_PASS_THROUGH_MS } from "./chart";
import {
  gradeForDeltaMs,
  MISS_GRACE_MS,
  type HitGrade,
} from "./scoring";

export type NoteState = "pending" | "judged";

export type JudgedNote = {
  note: ChartNote;
  grade: HitGrade;
  deltaMs: number;
};

export type VisibleNote = {
  note: ChartNote;
  /** 0 = spawn, 1 = hit line, >1 = past the baseline. */
  progress: number;
  state: NoteState;
  grade?: HitGrade;
};

export type DrumHeroPhase = "idle" | "countdown" | "playing" | "finished";

export class DrumHeroEngine {
  private chart: ChartNote[];
  private countInMs: number;
  private songEndMs: number;
  private startPerfMs: number | null = null;
  private judged = new Map<string, JudgedNote>();
  private lastCombo = 0;

  phase: DrumHeroPhase = "idle";
  results: JudgedNote[] = [];

  constructor(chart: ChartNote[], countInMs: number, songEndMs: number) {
    this.chart = chart;
    this.countInMs = countInMs;
    this.songEndMs = songEndMs;
  }

  /** Song clock — 0 at first note, negative during count-in. */
  songTimeMs(nowPerfMs: number): number {
    if (this.startPerfMs === null) return -this.countInMs;
    return nowPerfMs - this.startPerfMs - this.countInMs;
  }

  start(nowPerfMs: number): void {
    this.startPerfMs = nowPerfMs;
    this.phase = "countdown";
    this.judged.clear();
    this.results = [];
    this.lastCombo = 0;
  }

  tick(nowPerfMs: number): void {
    if (this.startPerfMs === null) return;

    const songMs = this.songTimeMs(nowPerfMs);

    if (this.phase === "countdown" && songMs >= 0) {
      this.phase = "playing";
    }

    if (this.phase === "playing" || this.phase === "countdown") {
      this.autoMiss(nowPerfMs);
    }

    if (this.phase === "playing" && songMs >= this.songEndMs) {
      this.autoMiss(nowPerfMs);
      this.phase = "finished";
    }
  }

  visibleNotes(nowPerfMs: number): VisibleNote[] {
    const songMs = this.songTimeMs(nowPerfMs);
    if (songMs < -this.countInMs) return [];

    return this.chart
      .filter((note) => {
        const spawnAt = note.timeMs - NOTE_LEAD_MS;
        return (
          songMs >= spawnAt - 100 &&
          songMs <= note.timeMs + NOTE_PASS_THROUGH_MS
        );
      })
      .map((note) => {
        const spawnAt = note.timeMs - NOTE_LEAD_MS;
        const progress = Math.max(0, (songMs - spawnAt) / NOTE_LEAD_MS);
        const judged = this.judged.get(note.id);
        return {
          note,
          progress,
          state: judged ? ("judged" as const) : ("pending" as const),
          grade: judged?.grade,
        };
      });
  }

  countInBeat(nowPerfMs: number): number | null {
    if (this.phase !== "countdown" || this.startPerfMs === null) return null;
    const elapsed = nowPerfMs - this.startPerfMs;
    const beat = Math.floor(elapsed / (this.countInMs / 3));
    return beat < 3 ? beat + 1 : null;
  }

  registerHit(code: DrumCode, nowPerfMs: number): JudgedNote | null {
    if (this.phase !== "playing") return null;

    const songMs = this.songTimeMs(nowPerfMs);
    const candidates = this.chart.filter(
      (n) => n.code === code && !this.judged.has(n.id),
    );

    let best: { note: ChartNote; delta: number } | null = null;
    for (const note of candidates) {
      const delta = songMs - note.timeMs;
      if (Math.abs(delta) > MISS_GRACE_MS) continue;
      // Earliest due note in window — avoids stealing hits from the note on the line.
      if (!best || note.timeMs < best.note.timeMs) {
        best = { note, delta };
      }
    }

    if (!best) return null;

    const grade = gradeForDeltaMs(Math.abs(best.delta));
    const result: JudgedNote = {
      note: best.note,
      grade,
      deltaMs: best.delta,
    };
    this.judged.set(best.note.id, result);
    this.results.push(result);
    if (grade !== "miss") this.lastCombo += 1;
    else this.lastCombo = 0;
    return result;
  }

  combo(): number {
    return this.lastCombo;
  }

  private autoMiss(nowPerfMs: number): void {
    const songMs = this.songTimeMs(nowPerfMs);
    for (const note of this.chart) {
      if (this.judged.has(note.id)) continue;
      if (songMs > note.timeMs + MISS_GRACE_MS) {
        const result: JudgedNote = {
          note,
          grade: "miss",
          deltaMs: songMs - note.timeMs,
        };
        this.judged.set(note.id, result);
        this.results.push(result);
        this.lastCombo = 0;
      }
    }
  }

  reset(): void {
    this.startPerfMs = null;
    this.phase = "idle";
    this.judged.clear();
    this.results = [];
    this.lastCombo = 0;
  }
}
