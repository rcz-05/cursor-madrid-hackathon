import {
  DRUM_CODES,
  resolveDrumCode,
  type DrumCode,
  type DrumInput,
} from "./drum-codes";
import { showDrumToast } from "./drum-toast";

export { Drum, type DrumAlias, type DrumInput } from "./drum-codes";

const SAMPLE_URLS: Record<DrumCode, string> = {
  feet_1: "/samples/feet_1.wav",
  feet_2: "/samples/feet_2.wav",
  arm_left_low: "/samples/arm_left_low.wav",
  arm_left_high: "/samples/arm_left_high.wav",
  arm_right_low: "/samples/arm_right_low.wav",
  arm_right_high: "/samples/arm_right_high.wav",
};

/** Random meme clip on right-top (`arm_right_high`) instead of the crash cymbal. */
const MEME_SAMPLE_URLS = [
  "/samples/meme1.mp3",
  "/samples/meme2.mp3",
  "/samples/meme3.mp3",
  "/samples/meme4.mp3",
] as const;

export class DrumPlayer {
  private static shared: DrumPlayer | null = null;

  private ctx: AudioContext | null = null;
  private buffers: Partial<Record<DrumCode, AudioBuffer>> = {};
  private memeBuffers: AudioBuffer[] = [];
  private loadPromise: Promise<void> | null = null;

  /** Shared player for `DrumPlayer.play()` — call once after a user gesture. */
  static async init(): Promise<DrumPlayer> {
    const player = DrumPlayer.shared ?? new DrumPlayer();
    DrumPlayer.shared = player;
    await player.unlock();
    return player;
  }

  /** Play on the shared instance (requires `init()` first). */
  static play(code: DrumInput, velocity = 1): void {
    if (!DrumPlayer.shared) {
      throw new Error(
        "DrumPlayer not ready — call await DrumPlayer.init() after a user gesture.",
      );
    }
    DrumPlayer.shared.play(code, velocity);
  }

  async unlock(): Promise<void> {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    await this.loadSamples();
  }

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === "running";
  }

  get samplesLoaded(): DrumCode[] {
    return DRUM_CODES.filter((code) => this.buffers[code] !== undefined);
  }

  private async loadSamples(): Promise<void> {
    if (!this.ctx) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      await Promise.all([
        ...DRUM_CODES.map(async (code) => {
          try {
            const res = await fetch(SAMPLE_URLS[code]);
            if (!res.ok) return;
            const arr = await res.arrayBuffer();
            this.buffers[code] = await this.ctx!.decodeAudioData(arr);
          } catch {
            // Fall back to synthesized voice for this pad.
          }
        }),
        ...MEME_SAMPLE_URLS.map(async (url) => {
          try {
            const res = await fetch(url);
            if (!res.ok) return;
            const arr = await res.arrayBuffer();
            const buffer = await this.ctx!.decodeAudioData(arr);
            this.memeBuffers.push(buffer);
          } catch {
            // Right-top falls back to crash sample or synth.
          }
        }),
      ]);
    })();

    return this.loadPromise;
  }

  play(code: DrumInput, velocity = 1): void {
    if (!this.ctx) return;
    const resolved = resolveDrumCode(code);
    if (!resolved) return;

    showDrumToast(resolved);

    const gain = Math.min(1, Math.max(0.1, velocity));

    if (resolved === "arm_right_high" && this.memeBuffers.length > 0) {
      const meme =
        this.memeBuffers[
          Math.floor(Math.random() * this.memeBuffers.length)
        ]!;
      this.playBuffer(meme, gain);
      return;
    }

    const buffer = this.buffers[resolved];
    if (buffer) {
      this.playBuffer(buffer, gain);
      return;
    }

    const t = this.ctx.currentTime;
    switch (resolved) {
      case "feet_1":
        this.kick(t, gain);
        break;
      case "feet_2":
        this.hatPedal(t, gain);
        break;
      case "arm_left_low":
        this.snare(t, gain);
        break;
      case "arm_left_high":
        this.hihat(t, gain);
        break;
      case "arm_right_low":
        this.tom(t, gain, 140);
        break;
      case "arm_right_high":
        this.crash(t, gain);
        break;
    }
  }

  private playBuffer(buffer: AudioBuffer, gain: number): void {
    const src = this.ctx!.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx!.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(this.ctx!.destination);
    src.start(0);
  }

  private out(gain: number, t: number): GainNode {
    const node = this.ctx!.createGain();
    node.gain.setValueAtTime(gain, t);
    node.connect(this.ctx!.destination);
    return node;
  }

  private kick(t: number, gain: number): void {
    const osc = this.ctx!.createOscillator();
    const g = this.out(gain * 0.9, t);
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  private hatPedal(t: number, gain: number): void {
    this.noiseBurst(t, gain * 0.35, 0.03, 8000, 0.4);
  }

  private snare(t: number, gain: number): void {
    const tone = this.ctx!.createOscillator();
    const tg = this.out(gain * 0.35, t);
    tone.type = "triangle";
    tone.frequency.setValueAtTime(180, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    tone.connect(tg);
    tone.start(t);
    tone.stop(t + 0.15);
    this.noiseBurst(t, gain * 0.55, 0.18, 4000, 0.5);
  }

  private hihat(t: number, gain: number): void {
    this.noiseBurst(t, gain * 0.45, 0.06, 10000, 0.25);
  }

  private tom(t: number, gain: number, freq: number): void {
    const osc = this.ctx!.createOscillator();
    const g = this.out(gain * 0.6, t);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  private crash(t: number, gain: number): void {
    this.noiseBurst(t, gain * 0.5, 0.9, 6000, 0.15);
  }

  private noiseBurst(
    t: number,
    gain: number,
    duration: number,
    filterHz: number,
    q: number,
  ): void {
    const bufferSize = this.ctx!.sampleRate * duration;
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = this.ctx!.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx!.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = filterHz;
    filter.Q.value = q;
    const g = this.out(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter);
    filter.connect(g);
    src.start(t);
  }
}
