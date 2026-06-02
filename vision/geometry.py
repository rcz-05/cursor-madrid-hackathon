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
