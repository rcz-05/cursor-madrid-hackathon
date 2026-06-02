"""Small 2D geometry helpers for hit detection."""

import math
from typing import Tuple

Point = Tuple[float, float]


def distance_point_to_segment(point: Point, start: Point, end: Point) -> float:
    """Shortest distance from `point` to the line segment [start, end].

    Treating each limb as a thick line segment (a "capsule") lets us test
    whether a wrist is near a whole limb, not just near a single joint.
    """
    px, py = point
    ax, ay = start
    bx, by = end

    dx = bx - ax
    dy = by - ay
    length_sq = dx * dx + dy * dy

    if length_sq == 0:
        # Degenerate segment: start == end.
        return math.hypot(px - ax, py - ay)

    # Project point onto the segment, clamped to the [0, 1] range so the
    # closest point never falls outside the actual limb.
    t = ((px - ax) * dx + (py - ay) * dy) / length_sq
    t = max(0.0, min(1.0, t))

    closest_x = ax + t * dx
    closest_y = ay + t * dy
    return math.hypot(px - closest_x, py - closest_y)


def _ccw(a: Point, b: Point, c: Point) -> float:
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def _segments_intersect(p1: Point, p2: Point, p3: Point, p4: Point) -> bool:
    """True if segment [p1,p2] crosses segment [p3,p4]."""
    d1 = _ccw(p3, p4, p1)
    d2 = _ccw(p3, p4, p2)
    d3 = _ccw(p1, p2, p3)
    d4 = _ccw(p1, p2, p4)
    if ((d1 > 0) != (d2 > 0)) and ((d3 > 0) != (d4 > 0)):
        return True
    return False


def segment_to_segment_distance(p1: Point, p2: Point, p3: Point, p4: Point) -> float:
    """Shortest distance between segments [p1,p2] and [p3,p4].

    Used for *swept* hit detection: [p1,p2] is the wrist's motion this frame and
    [p3,p4] is the limb zone. This catches a fast strike that crosses a thin
    zone between two frames (which a point-only test would miss / "tunnel").
    """
    if _segments_intersect(p1, p2, p3, p4):
        return 0.0
    return min(
        distance_point_to_segment(p1, p3, p4),
        distance_point_to_segment(p2, p3, p4),
        distance_point_to_segment(p3, p1, p2),
        distance_point_to_segment(p4, p1, p2),
    )
