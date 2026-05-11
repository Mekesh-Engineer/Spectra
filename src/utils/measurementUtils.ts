/**
 * Convert pixel dimensions to real-world units using calibration data.
 */
export function pixelsToUnits(
  pixels: number,
  pixelsPerUnit: number
): number {
  if (pixelsPerUnit <= 0) return 0;
  return pixels / pixelsPerUnit;
}

/**
 * Calculate the dimensions of a bounding box in real-world units.
 */
export function calculateDimensions(
  bbox: { width: number; height: number },
  pixelsPerUnit: number
): { width: number; height: number } {
  return {
    width: pixelsToUnits(bbox.width, pixelsPerUnit),
    height: pixelsToUnits(bbox.height, pixelsPerUnit),
  };
}

/**
 * Calculate area from width and height.
 */
export function calculateArea(width: number, height: number): number {
  return width * height;
}
