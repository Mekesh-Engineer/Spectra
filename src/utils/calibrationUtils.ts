export interface CalibrationData {
  pixelsPerUnit: number;
  unit: string;
  referenceWidth: number;
  referenceHeight: number;
}

/**
 * Calculate pixels-per-unit from a known reference object.
 */
export function calibrate(
  referenceSizeInUnits: number,
  referenceSizeInPixels: number
): number {
  if (referenceSizeInUnits <= 0) return 0;
  return referenceSizeInPixels / referenceSizeInUnits;
}

/**
 * Validate that the calibration data is reasonable.
 */
export function isCalibrationValid(data: CalibrationData): boolean {
  return (
    data.pixelsPerUnit > 0 &&
    data.referenceWidth > 0 &&
    data.referenceHeight > 0
  );
}
