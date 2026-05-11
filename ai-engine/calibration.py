"""
Calibration utilities for the measurement engine.
"""

import json
from dataclasses import dataclass
from pathlib import Path

from utils import logger


@dataclass
class CalibrationData:
    pixels_per_unit: float
    unit: str
    reference_width: float
    reference_height: float


def calibrate(
    reference_size_units: float,
    reference_size_pixels: float,
) -> float:
    """Calculate pixels-per-unit from a known reference object."""
    if reference_size_units <= 0:
        raise ValueError("Reference size must be positive")
    return reference_size_pixels / reference_size_units


def load_calibration(path: str) -> CalibrationData:
    """Load calibration data from a JSON file."""
    file_path = Path(path)
    if not file_path.exists():
        logger.warning(f"Calibration file not found: {path}, using defaults")
        return CalibrationData(
            pixels_per_unit=10.0,
            unit="mm",
            reference_width=100.0,
            reference_height=100.0,
        )

    with open(file_path) as f:
        data = json.load(f)

    return CalibrationData(
        pixels_per_unit=data["pixels_per_unit"],
        unit=data.get("unit", "mm"),
        reference_width=data.get("reference_width", 0),
        reference_height=data.get("reference_height", 0),
    )


def save_calibration(cal: CalibrationData, path: str) -> None:
    """Save calibration data to a JSON file."""
    with open(path, "w") as f:
        json.dump(
            {
                "pixels_per_unit": cal.pixels_per_unit,
                "unit": cal.unit,
                "reference_width": cal.reference_width,
                "reference_height": cal.reference_height,
            },
            f,
            indent=2,
        )
    logger.info(f"Calibration saved to {path}")
