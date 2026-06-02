"""Body-drum pose detector.

Pipeline per frame:
  1. Run LibreYOLO YOLO-NAS pose estimation -> person boxes + 17 COCO keypoints.
  2. Pick the single most prominent person (largest box).
  3. Build six limb "capsule" zones from keypoints.
  4. Emit a `hit` event when a wrist *enters* a zone while moving fast enough,
     respecting per-zone cooldown and keypoint confidence.

The hit logic lives in `process_points` so it can be unit-tested with synthetic
keypoints (see test_detector.py) without running the model.
"""

import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np
from libreyolo import LibreYOLO

from geometry import segment_to_segment_distance
from schemas import VisionEvent, VisionResult

Point = Tuple[float, float]

# Full 17-keypoint COCO name list (index -> name), used for the draw overlay.
COCO_KEYPOINT_NAMES = [
    "nose",
    "left_eye",
    "right_eye",
    "left_ear",
    "right_ear",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
]

# COCO keypoint indices produced by the pose model.
KEYPOINTS = {
    "left_shoulder": 5,
    "right_shoulder": 6,
    "left_elbow": 7,
    "right_elbow": 8,
    "left_wrist": 9,
    "right_wrist": 10,
    "left_hip": 11,
    "right_hip": 12,
    "left_knee": 13,
    "right_knee": 14,
    "left_ankle": 15,
    "right_ankle": 16,
}

# --- Live-tunable thresholds (the three the demo cares about are the first 3) ---
# Tuned strict: a hit only fires on a deliberate, fast strike that actually
# crosses the limb zone. Smaller radius + higher speed + longer cooldown.
ZONE_RADIUS_PX = 26        # how close the wrist path must get to a limb (416px frame)
MIN_WRIST_SPEED = 45       # minimum strike speed (scaled px/s, see _wrist_speed)
COOLDOWN_MS = 350          # per-zone refractory period to stop sound spam
MIN_KEYPOINT_CONF = 0.5    # ignore low-confidence joints (strict)
SPEED_SCALE = 10.0         # divides raw px/s into a friendlier 0..~100 range

MODEL_NAME = "LibreYOLONASs-pose.pt"

# Limb -> (keypoint A, keypoint B). Legs use hip->knee (more reliably visible
# than the ankle for a seated/standing webcam framing).
ZONE_DEFS: Dict[str, Tuple[str, str]] = {
    "upper_left_arm": ("left_shoulder", "left_elbow"),
    "lower_left_arm": ("left_elbow", "left_wrist"),
    "upper_right_arm": ("right_shoulder", "right_elbow"),
    "lower_right_arm": ("right_elbow", "right_wrist"),
    "left_leg": ("left_hip", "left_knee"),
    "right_leg": ("right_hip", "right_knee"),
}


@dataclass
class VisionState:
    previous_wrists: Dict[str, Point] = field(default_factory=dict)
    previous_time: Optional[float] = None
    last_zone_hit_ms: Dict[str, float] = field(default_factory=dict)
    was_inside: Dict[str, bool] = field(default_factory=dict)


def _to_numpy(arr) -> np.ndarray:
    """Accept either a torch tensor or a numpy array and return numpy."""
    if hasattr(arr, "detach"):
        arr = arr.detach()
    if hasattr(arr, "cpu"):
        arr = arr.cpu()
    return np.asarray(arr)


class BodyDrumDetector:
    def __init__(self, model_name: str = MODEL_NAME) -> None:
        self.model = LibreYOLO(model_name)
        # Best-effort device label for debug output.
        self.device = str(getattr(self.model, "device", "auto"))
        self.state = VisionState()

    # ------------------------------------------------------------------ #
    # Frame entry point
    # ------------------------------------------------------------------ #
    def detect(self, frame_bgr: np.ndarray) -> VisionResult:
        now = time.time()
        h, w = frame_bgr.shape[:2]
        result = self.model(frame_bgr)

        keypoints = getattr(result, "keypoints", None)
        if keypoints is None or len(_to_numpy(keypoints.xy)) == 0:
            # No person -> reset motion history so a re-entry isn't read as a
            # huge velocity jump.
            self.state.previous_wrists = {}
            self.state.previous_time = now
            return {"events": [], "debug": {"person_detected": False, "device": self.device}}

        xy = _to_numpy(keypoints.xy)          # (num_people, 17, 2)
        conf = _to_numpy(keypoints.conf)      # (num_people, 17)

        person_index = self._select_person(result, xy)
        person_xy = xy[person_index]
        person_conf = conf[person_index]
        points = self._extract_points(person_xy, person_conf)

        outcome = self.process_points(points, now)
        # Attach a normalized (0..1) draw overlay so the frontend can render
        # keypoint circles, the skeleton, and the six zone capsules.
        outcome["debug"]["keypoints"] = self._overlay_keypoints(person_xy, person_conf, w, h)
        outcome["debug"]["segments"] = self._overlay_segments(points, w, h)
        # Normalized hit radius so the frontend draws the true trigger box.
        outcome["debug"]["zone_radius"] = ZONE_RADIUS_PX / w
        return outcome

    def _overlay_keypoints(self, xy: np.ndarray, conf: np.ndarray, w: int, h: int):
        dots = []
        for idx, name in enumerate(COCO_KEYPOINT_NAMES):
            if conf[idx] >= MIN_KEYPOINT_CONF:
                dots.append({"name": name, "x": float(xy[idx][0]) / w, "y": float(xy[idx][1]) / h})
        return dots

    def _overlay_segments(self, points: Dict[str, Point], w: int, h: int):
        segs = []
        for zone, (a, b) in ZONE_DEFS.items():
            if a in points and b in points:
                (ax, ay), (bx, by) = points[a], points[b]
                segs.append(
                    {"zone": zone, "ax": ax / w, "ay": ay / h, "bx": bx / w, "by": by / h}
                )
        return segs

    # ------------------------------------------------------------------ #
    # Person selection: largest bounding box (closest / most prominent).
    # ------------------------------------------------------------------ #
    def _select_person(self, result, xy: np.ndarray) -> int:
        boxes = getattr(result, "boxes", None)
        if boxes is not None and getattr(boxes, "xyxy", None) is not None:
            xyxy = _to_numpy(boxes.xyxy)
            if len(xyxy) == len(xy):
                areas = (xyxy[:, 2] - xyxy[:, 0]) * (xyxy[:, 3] - xyxy[:, 1])
                return int(np.argmax(areas))
        return 0

    def _extract_points(self, xy: np.ndarray, conf: np.ndarray) -> Dict[str, Point]:
        points: Dict[str, Point] = {}
        for name, idx in KEYPOINTS.items():
            if conf[idx] >= MIN_KEYPOINT_CONF:
                points[name] = (float(xy[idx][0]), float(xy[idx][1]))
        return points

    # ------------------------------------------------------------------ #
    # Hit logic (model-independent, unit-testable).
    # ------------------------------------------------------------------ #
    def process_points(self, points: Dict[str, Point], now: float) -> VisionResult:
        zones = self._build_zones(points)
        events = self._detect_hits(points, zones, now)
        return {
            "events": events,
            "debug": {
                "person_detected": True,
                "zones": list(zones.keys()),
                "device": self.device,
            },
        }

    def _build_zones(self, points: Dict[str, Point]) -> Dict[str, Tuple[Point, Point]]:
        zones: Dict[str, Tuple[Point, Point]] = {}
        for zone, (a, b) in ZONE_DEFS.items():
            if a in points and b in points:
                zones[zone] = (points[a], points[b])
        return zones

    def _detect_hits(
        self,
        points: Dict[str, Point],
        zones: Dict[str, Tuple[Point, Point]],
        now: float,
    ) -> List[VisionEvent]:
        events: List[VisionEvent] = []
        now_ms = now * 1000

        wrists = {
            "left_wrist": points.get("left_wrist"),
            "right_wrist": points.get("right_wrist"),
        }

        for hand, wrist in wrists.items():
            if wrist is None:
                continue

            velocity = self._wrist_speed(hand, wrist, now)
            prev = self.state.previous_wrists.get(hand)
            motion_start = prev if prev is not None else wrist
            for zone, segment in zones.items():
                if not self._zone_allowed(hand, zone):
                    continue

                pair_key = f"{hand}:{zone}"
                # Swept hit test: the wrist's motion segment this frame against
                # the limb zone — catches fast strikes without tunneling.
                distance = segment_to_segment_distance(
                    motion_start, wrist, segment[0], segment[1]
                )
                inside = distance <= ZONE_RADIUS_PX
                was_inside = self.state.was_inside.get(pair_key, False)
                self.state.was_inside[pair_key] = inside

                cooldown_ready = (
                    now_ms - self.state.last_zone_hit_ms.get(zone, 0.0) >= COOLDOWN_MS
                )
                entered_zone = inside and not was_inside

                if entered_zone and velocity >= MIN_WRIST_SPEED and cooldown_ready:
                    self.state.last_zone_hit_ms[zone] = now_ms
                    events.append(
                        {
                            "type": "hit",
                            "zone": zone,
                            "confidence": max(0.0, min(1.0, 1.0 - distance / ZONE_RADIUS_PX)),
                            "hand": hand,
                            "velocity": velocity,
                            "timestamp": now,
                        }
                    )

        self.state.previous_wrists = {k: v for k, v in wrists.items() if v is not None}
        self.state.previous_time = now
        return events

    def _wrist_speed(self, hand: str, wrist: Point, now: float) -> float:
        previous = self.state.previous_wrists.get(hand)
        if previous is None or self.state.previous_time is None:
            return 0.0
        dt = max(1e-3, now - self.state.previous_time)
        dx = wrist[0] - previous[0]
        dy = wrist[1] - previous[1]
        return float((dx * dx + dy * dy) ** 0.5 / dt / SPEED_SCALE)

    @staticmethod
    def _zone_allowed(hand: str, zone: str) -> bool:
        """Strict cross-body rule.

        Arm zones may only be struck by the *opposite* hand (a left wrist hits
        right-arm zones and vice-versa) — this removes the constant same-side
        false triggers from a hand resting near its own arm. Legs can be struck
        by either hand.
        """
        if zone.endswith("_arm"):
            zone_side = "left" if "left" in zone else "right"
            hand_side = "left" if hand == "left_wrist" else "right"
            return zone_side != hand_side
        return True
