// Shared vision contract — mirrors vision/schemas.py on the Python backend.
// The music branch can listen for the `vision:hit` browser event dispatched by
// the vision pipeline (see use-vision-pipeline.ts), or read these types directly.

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

// One detected pose keypoint, normalized to 0..1 of the frame.
export type Keypoint = { name: string; x: number; y: number };

// A limb "capsule" zone as a normalized segment.
export type ZoneSegment = {
  zone: DrumZone;
  ax: number;
  ay: number;
  bx: number;
  by: number;
};

export type VisionDebug = {
  person_detected?: boolean;
  zones?: string[];
  keypoints?: Keypoint[];
  segments?: ZoneSegment[];
  /** Hit radius, normalized to frame width — draw capsules at this true width. */
  zone_radius?: number;
  fps?: number;
  device?: string;
};

export type VisionMessage = {
  events: VisionEvent[];
  debug?: VisionDebug;
};

// Skeleton edges drawn between keypoints (COCO subset relevant to body drum).
export const SKELETON_EDGES: [string, string][] = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

// Name of the browser CustomEvent fired for each detected hit.
export const VISION_HIT_EVENT = "vision:hit";

// WebSocket URL of the Python vision backend. Override with
// NEXT_PUBLIC_VISION_WS in .env.local if the backend runs elsewhere.
export const VISION_WS_URL =
  process.env.NEXT_PUBLIC_VISION_WS ?? "ws://localhost:8000/ws/vision";
