import { apiClient } from "./apiClient";
import type { Detection } from "@shared/types/detection.types";
import type { MeasurementOutput } from "@shared/types/measurement.types";

export interface DualDetectionResult {
  detections: (Detection & { model: "circle" | "line" })[];
  circleCount: number;
  lineCount: number;
  measurements: MeasurementOutput;
  frameWidth?: number;
  frameHeight?: number;
}

export const inferenceService = {
  detect: async (imageData: string): Promise<Detection[]> => {
    const result = await apiClient.post<{ detections: Detection[] }>(
      "/inference/detect",
      { image: imageData }
    );
    return result.detections;
  },

  /**
   * Run both pipe_circle_detection + pipe_line_detection in parallel,
   * with dimensional measurement processing.
   */
  detectDual: async (
    imageData: string,
    pixelsPerMm?: number
  ): Promise<DualDetectionResult> => {
    return apiClient.post<DualDetectionResult>(
      "/inference/detect-dual",
      { image: imageData, pixelsPerMm }
    );
  },

  /** Process existing detections through the measurement pipeline (no re-inference) */
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

  getModelInfo: async () => {
    return apiClient.get<{
      models: { id: string; name: string; type: string }[];
      status: string;
    }>("/inference/model");
  },
};
