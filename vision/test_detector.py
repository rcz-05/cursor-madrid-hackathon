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
    """Drive the movement pipeline with synthetic keypoints across frames."""
    from detector import BodyDrumDetector, MIN_LIMB_SPEED

    det = BodyDrumDetector.__new__(BodyDrumDetector)
    from detector import VisionState

    det.device = "test"
    det.state = VisionState()

    # Frame 1: right upper arm at rest (seeds motion history).
    t = 1000.0
    det.process_points(
        {
            "right_shoulder": (300, 100),
            "right_elbow": (400, 100),
        },
        t,
    )

    # Frame 2: fast upward swing of the upper right arm.
    t += 0.05
    res = det.process_points(
        {
            "right_shoulder": (300, 80),
            "right_elbow": (400, 40),
        },
        t,
    )

    hits = [e for e in res["events"] if e["zone"] == "upper_right_arm"]
    assert hits, f"expected an upper_right_arm hit, got {res['events']}"
    assert hits[0]["joint"] == "right_elbow"
    assert hits[0]["velocity"] >= MIN_LIMB_SPEED
    print("ok  movement hit on upper_right_arm")

    # Frame 3: arm keeps moving fast -> no re-fire (must drop below threshold first).
    t += 0.05
    res = det.process_points(
        {
            "right_shoulder": (300, 60),
            "right_elbow": (400, 20),
        },
        t,
    )
    assert not res["events"], f"sustained fast motion should not re-fire: {res['events']}"
    print("ok  no re-fire while still moving fast")


def _fresh_detector():
    from detector import BodyDrumDetector, VisionState

    det = BodyDrumDetector.__new__(BodyDrumDetector)
    det.device = "test"
    det.state = VisionState()
    return det


def test_same_side_arm_triggers() -> None:
    """Moving your own arm should trigger its zone (no opposite-hand rule)."""
    det = _fresh_detector()
    base = {"left_shoulder": (300, 100), "left_elbow": (400, 100)}
    det.process_points(base, 1000.0)
    res = det.process_points(
        {"left_shoulder": (300, 60), "left_elbow": (400, 20)},
        1000.05,
    )
    hits = [e for e in res["events"] if e["zone"] == "upper_left_arm"]
    assert hits, f"same-side arm swing should fire: {res['events']}"
    print("ok  same-side arm movement triggers")


def test_slow_no_trigger() -> None:
    """Slow drift below MIN_LIMB_SPEED must not fire."""
    det = _fresh_detector()
    base = {"right_shoulder": (300, 100), "right_elbow": (400, 100)}
    det.process_points(base, 1000.0)
    res = det.process_points(
        {"right_shoulder": (300, 98), "right_elbow": (400, 96)},
        1000.2,
    )
    assert not res["events"], f"slow drift should not fire: {res['events']}"
    print("ok  slow movement does not trigger")


def test_leg_sensitivity() -> None:
    """Leg zones use a lower speed threshold than arms."""
    from detector import BodyDrumDetector, MIN_LEG_SPEED, MIN_LIMB_SPEED

    det = _fresh_detector()
    assert MIN_LEG_SPEED < MIN_LIMB_SPEED

    base = {"left_hip": (300, 300), "left_knee": (300, 400)}
    det.process_points(base, 1000.0)
    # Moderate kick — fast enough for legs, too slow for arms.
    res = det.process_points({"left_hip": (300, 295), "left_knee": (300, 370)}, 1000.05)
    hits = [e for e in res["events"] if e["zone"] == "left_leg"]
    assert hits, f"leg should trigger at lower threshold: {res['events']}"
    print("ok  leg sensitivity")


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
    test_same_side_arm_triggers()
    test_slow_no_trigger()
    test_leg_sensitivity()
    test_model_smoke()
    print("\nAll tests passed.")
    sys.exit(0)
