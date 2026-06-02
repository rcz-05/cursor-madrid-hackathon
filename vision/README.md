# Vision backend — Body Drum

Pose-based "body drum": a webcam sees one person, the backend detects pose
keypoints, builds six limb zones, and emits a `hit` event when a moving wrist
strikes a zone. The music/frontend branches turn those events into sound.

## Stack

- **LibreYOLO** (YOLO-NAS pose, `LibreYOLONASs-pose.pt`) — 17 COCO keypoints
- **torch / torchvision** — inference (uses Apple-Silicon **MPS** when available)
- **FastAPI + uvicorn[standard]** — WebSocket server
- **OpenCV / NumPy / Pillow** — frame decode + array ops

## Setup

```bash
cd vision
uv venv --python 3.12 .venv          # or: python -m venv .venv
uv pip install -r requirements.txt   # or: pip install -r requirements.txt
```

The pose weights (~85 MB) download automatically from Deci's CDN on first model
load into `vision/weights/` (gitignored). YOLO-NAS weights are under Deci's
non-commercial license — fine for a hackathon demo.

## Run

```bash
cd vision
.venv/bin/uvicorn server:app --reload --port 8000
```

Check it's alive:

```bash
curl http://localhost:8000/health        # -> {"status":"ok","device":"..."}
```

## Test

```bash
.venv/bin/python test_detector.py
```

Runs fast geometry + hit-logic unit tests, then a model smoke test on the
bundled sample image.

## Files

| file | role |
|------|------|
| `server.py` | FastAPI app, `/health`, `/ws/vision` WebSocket |
| `detector.py` | `BodyDrumDetector` — pose → zones → hit events |
| `geometry.py` | point-to-segment distance (limb capsule test) |
| `schemas.py` | `VisionEvent` / `VisionResult` shapes |
| `test_detector.py` | unit + smoke tests |

## Protocol

Client → server (per frame):

```json
{ "image": "data:image/jpeg;base64,..." }
```

Server → client:

```json
{
  "events": [
    { "type": "hit", "zone": "upper_right_arm", "confidence": 0.87,
      "hand": "left_wrist", "velocity": 42.5, "timestamp": 1717351200.123 }
  ],
  "debug": { "person_detected": true, "fps": 8.5, "device": "mps", "zones": ["..."] }
}
```

The six zones: `upper_left_arm`, `lower_left_arm`, `upper_right_arm`,
`lower_right_arm`, `left_leg`, `right_leg`.

## Tuning (live, during demo)

In `detector.py`:

```python
ZONE_RADIUS_PX = 45     # how close a wrist must get to a limb
MIN_WRIST_SPEED = 25    # minimum wrist speed to count as a strike
COOLDOWN_MS = 220       # per-zone refractory period
```
