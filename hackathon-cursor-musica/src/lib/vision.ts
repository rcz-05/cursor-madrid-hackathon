// Shared vision contract — mirrors vision/schemas.py on the Python backend.
// The music branch can import these types and listen for the `vision:hit`
// browser event dispatched by <VisionClient />.

export type DrumZone =
  | "upper_right_arm"
  | "upper_left_arm"
  | "lower_right_arm"
  | "lower_left_arm"
  | "right_leg"
  | "left_leg";

export type Hand = "left_wrist" | "right_wrist";

export type VisionEvent = {
  type: "hit";
  zone: DrumZone;
  confidence: number;
  hand: Hand;
  velocity: number;
  timestamp: number;
};

export type VisionDebug = {
  person_detected?: boolean;
  zones?: string[];
  fps?: number;
  device?: string;
};

export type VisionMessage = {
  events: VisionEvent[];
  debug?: VisionDebug;
};

// Suggested zone -> drum-sound mapping (the music branch owns the real sounds).
export const ZONE_SOUND: Record<DrumZone, string> = {
  upper_right_arm: "snare",
  upper_left_arm: "clap",
  lower_right_arm: "hihat",
  lower_left_arm: "tom",
  right_leg: "kick",
  left_leg: "floor_tom",
};

// Name of the browser CustomEvent fired for each detected hit.
export const VISION_HIT_EVENT = "vision:hit";

// WebSocket URL of the Python vision backend. Override with
// NEXT_PUBLIC_VISION_WS in .env.local if the backend runs elsewhere.
export const VISION_WS_URL =
  process.env.NEXT_PUBLIC_VISION_WS ?? "ws://localhost:8000/ws/vision";
