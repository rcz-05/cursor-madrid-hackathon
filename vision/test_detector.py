"""Lightweight tests for the vision backend.

Run with the venv's python:
    .venv/bin/python test_detector.py

The geometry + hit-logic tests are fast and model-free. The model smoke test
runs real pose estimation on the bundled sample image (skipped if the model /
weights are unavailable).
"""

import sys

from geometry import distance_point_to_segment


def test_geometry() -> None:
    # Point directly above the middle of a horizontal segment.
    assert abs(distance_point_to_segment((5, 3), (0, 0), (10, 0)) - 3.0) < 1e-6
    # Point beyond an endpoint clamps to that endpoint.
    assert abs(distance_point_to_segment((13, 4), (0, 0), (10, 0)) - 5.0) < 1e-6
    # Degenerate segment behaves like point-to-point distance.
    assert abs(distance_point_to_segment((3, 4), (0, 0), (0, 0)) - 5.0) < 1e-6
    print("ok  geometry")


def test_hit_logic() -> None:
    """Drive the hit pipeline with synthetic keypoints across frames."""
    from detector import BodyDrumDetector, MIN_WRIST_SPEED

    # Build a detector without loading the model.
    det = BodyDrumDetector.__new__(BodyDrumDetector)
    from detector import VisionState

    det.device = "test"
    det.state = VisionState()

    # A right arm to aim at: shoulder->elbow forms upper_right_arm around y=100.
    base = {
        "right_shoulder": (300, 100),
        "right_elbow": (400, 100),
    }

    # Frame 1: left wrist parked far away (seeds motion history, not inside).
    t = 1000.0
    det.process_points({**base, "left_wrist": (50, 400)}, t)

    # Frame 2: left wrist slams into the upper_right_arm zone, moving fast.
    t += 0.05  # 50 ms later
    res = det.process_points({**base, "left_wrist": (350, 100)}, t)

    hits = [e for e in res["events"] if e["zone"] == "upper_right_arm"]
    assert hits, f"expected an upper_right_arm hit, got {res['events']}"
    assert hits[0]["hand"] == "left_wrist"
    assert hits[0]["velocity"] >= MIN_WRIST_SPEED
    print("ok  hit detected on zone entry")

    # Frame 3: wrist stays inside -> no new hit (must re-enter, plus cooldown).
    t += 0.05
    res = det.process_points({**base, "left_wrist": (350, 100)}, t)
    assert not res["events"], f"stationary-inside should not re-fire: {res['events']}"
    print("ok  no re-fire while staying inside")


def _fresh_detector():
    from detector import BodyDrumDetector, VisionState

    det = BodyDrumDetector.__new__(BodyDrumDetector)
    det.device = "test"
    det.state = VisionState()
    return det


def test_opposite_hand_rule() -> None:
    """A wrist must NOT trigger a same-side arm zone (only the opposite hand)."""
    det = _fresh_detector()
    # upper_left_arm zone; the LEFT wrist (same side) slams into it fast.
    base = {"left_shoulder": (300, 100), "left_elbow": (400, 100)}
    det.process_points({**base, "left_wrist": (50, 400)}, 1000.0)
    res = det.process_points({**base, "left_wrist": (350, 100)}, 1000.05)
    assert all(e["zone"] != "upper_left_arm" for e in res["events"]), res["events"]
    print("ok  same-side arm not triggered (opposite-hand rule)")


def test_slow_no_trigger() -> None:
    """Entering a zone slowly (below MIN_WRIST_SPEED) must not fire."""
    det = _fresh_detector()
    base = {"right_shoulder": (300, 100), "right_elbow": (400, 100)}
    # Just outside, then a small slow drift inside over 0.2s.
    det.process_points({**base, "left_wrist": (350, 140)}, 1000.0)
    res = det.process_points({**base, "left_wrist": (350, 112)}, 1000.2)
    assert not res["events"], f"slow drift should not fire: {res['events']}"
    print("ok  slow entry does not trigger")


def test_model_smoke() -> None:
    try:
        import cv2
        from libreyolo import LibreYOLO, SAMPLE_IMAGE
        from detector import BodyDrumDetector
    except Exception as exc:  # pragma: no cover
        print(f"skip model smoke test (import failed: {exc})")
        return

    try:
        det = BodyDrumDetector()
        frame = cv2.imread(SAMPLE_IMAGE)
        res = det.detect(frame)
    except Exception as exc:  # pragma: no cover
        print(f"skip model smoke test (model/weights unavailable: {exc})")
        return

    assert res["debug"]["person_detected"] is True
    print(f"ok  model smoke (device={res['debug'].get('device')}, "
          f"zones={res['debug'].get('zones')})")


if __name__ == "__main__":
    test_geometry()
    test_hit_logic()
    test_opposite_hand_rule()
    test_slow_no_trigger()
    test_model_smoke()
    print("\nAll tests passed.")
    sys.exit(0)
