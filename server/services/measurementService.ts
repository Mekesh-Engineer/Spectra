export const measurementService = {
  /**
   * Calculate real-world dimensions from detection bounding boxes.
   */
  calculateDimensions(
    bbox: { width: number; height: number },
    pixelsPerUnit: number,
    unit: string
  ) {
    return {
      width: bbox.width / pixelsPerUnit,
      height: bbox.height / pixelsPerUnit,
      unit,
    };
  },

  /**
   * Check if measurements are within tolerance.
   */
  isWithinTolerance(
    measured: number,
    expected: number,
    tolerancePercent: number
  ): boolean {
    const delta = Math.abs(measured - expected);
    return delta <= (expected * tolerancePercent) / 100;
  },
};
