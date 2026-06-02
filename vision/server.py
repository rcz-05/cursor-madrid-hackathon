"""FastAPI WebSocket server for the body-drum vision backend.

The frontend opens a WebSocket to /ws/vision and streams JSON messages of the
form {"image": "<base64 jpeg data url>"}. For each frame we run pose detection
and reply with {"events": [...], "debug": {...}}.
"""

import base64
import json
import time

import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from detector import BodyDrumDetector

app = FastAPI(title="Body Drum Vision Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the pose model once at startup (downloads weights on first run).
detector = BodyDrumDetector()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "device": detector.device}


@app.websocket("/ws/vision")
async def vision_socket(websocket: WebSocket) -> None:
    await websocket.accept()
    # Exponential moving average of FPS for the debug overlay.
    fps = 0.0
    last = time.time()
    try:
        while True:
            message = await websocket.receive_text()
            payload = json.loads(message)
            frame_bgr = decode_data_url(payload["image"])
            result = detector.detect(frame_bgr)

            now = time.time()
            dt = now - last
            last = now
            if dt > 0:
                fps = 0.9 * fps + 0.1 * (1.0 / dt) if fps else 1.0 / dt
            result.setdefault("debug", {})["fps"] = round(fps, 1)

            await websocket.send_json(result)
    except WebSocketDisconnect:
        return


def decode_data_url(data_url: str) -> np.ndarray:
    """Decode a base64 (data-URL or raw) JPEG into an OpenCV BGR frame."""
    encoded = data_url.split(",", 1)[1] if "," in data_url else data_url
    image_bytes = base64.b64decode(encoded)
    image_array = np.frombuffer(image_bytes, dtype=np.uint8)
    frame = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Could not decode image")
    return frame
