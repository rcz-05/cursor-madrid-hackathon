"""Shared types for the body-drum vision backend.

The frontend (Next.js) and the music branch consume the JSON shape produced
here, so keep this in sync with the TypeScript `VisionEvent` type.
"""

from typing import List, Literal, TypedDict

DrumZone = Literal[
    "upper_right_arm",
    "upper_left_arm",
    "lower_right_arm",
    "lower_left_arm",
    "right_leg",
    "left_leg",
]

Hand = Literal["left_wrist", "right_wrist"]


class VisionEvent(TypedDict):
    type: Literal["hit"]
    zone: DrumZone
    confidence: float
    hand: Hand
    velocity: float
    timestamp: float


class KeypointDot(TypedDict):
    name: str
    x: float  # normalized 0..1
    y: float  # normalized 0..1


class ZoneSegment(TypedDict):
    zone: str
    ax: float  # normalized endpoint A
    ay: float
    bx: float  # normalized endpoint B
    by: float


class DebugInfo(TypedDict, total=False):
    person_detected: bool
    zones: List[str]
    keypoints: List[KeypointDot]
    segments: List[ZoneSegment]
    fps: float
    device: str


class VisionResult(TypedDict):
    events: List[VisionEvent]
    debug: DebugInfo
