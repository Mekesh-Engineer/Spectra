import { apiClient } from "./apiClient";
import type { MeasurementOutput } from "@shared/types/measurement.types";
import type { Detection } from "@shared/types/detection.types";

/**
 * Measurement service — uses the backend's inference/measure endpoint
 * to run detections through the dimensional measurement pipeline.
 */
export const measurementService = {
  /** Process detections through the measurement pipeline */
  measure: async (
    detections: (Detection & { model: "circle" | "line" })[],
    pixelsPerMm = 4.0,
    confidenceThreshold = 0.85
  ): Promise<MeasurementOutput> => {
    return apiClient.post<MeasurementOutput>(
      "/inference/measure",
      { detections, pixelsPerMm, confidenceThreshold }
    );
  },
};
