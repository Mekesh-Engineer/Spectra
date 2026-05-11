"""
Spectra Measurement Engine
Uses OpenCV to calculate real-world dimensions from camera frames.
"""

import cv2
import numpy as np
from calibration import CalibrationData, load_calibration
from utils import logger


def measure_objects(
    frame: np.ndarray,
    detections: list[dict],
    calibration: CalibrationData,
) -> list[dict]:
    """
    Given a frame, detected bounding boxes, and calibration data,
    compute real-world measurements for each detection.
    """
    results = []

    for det in detections:
        x = det["x"]
        y = det["y"]
        w = det["width"]
        h = det["height"]

        real_width = w / calibration.pixels_per_unit
        real_height = h / calibration.pixels_per_unit

        results.append(
            {
                "label": det.get("label", "unknown"),
                "width": round(real_width, 2),
                "height": round(real_height, 2),
                "unit": calibration.unit,
                "confidence": det.get("confidence", 0),
                "bbox": {"x": x, "y": y, "w": w, "h": h},
            }
        )

    logger.info(f"Measured {len(results)} objects")
    return results


def draw_measurements(
    frame: np.ndarray,
    measurements: list[dict],
) -> np.ndarray:
    """Draw measurement annotations on the frame."""
    annotated = frame.copy()

    for m in measurements:
        bbox = m["bbox"]
        x, y, w, h = bbox["x"], bbox["y"], bbox["w"], bbox["h"]

        cv2.rectangle(annotated, (x, y), (x + w, y + h), (99, 102, 241), 2)

        text = f'{m["label"]}: {m["width"]:.1f}x{m["height"]:.1f} {m["unit"]}'
        cv2.putText(
            annotated, text, (x, y - 8),
            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (99, 102, 241), 1,
        )

    return annotated


if __name__ == "__main__":
    cal = load_calibration("calibration.json")
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        logger.error("Cannot open camera")
        exit(1)

    logger.info("Measurement engine started")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Placeholder: detections would come from inference API
        detections: list[dict] = []
        measurements = measure_objects(frame, detections, cal)
        annotated = draw_measurements(frame, measurements)

        cv2.imshow("Spectra", annotated)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()
