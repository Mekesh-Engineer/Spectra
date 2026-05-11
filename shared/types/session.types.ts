import type { Detection } from "./detection.types";
import type { MeasurementResult } from "./measurement.types";

export interface InspectionSession {
  id: string;
  userId: string;
  cameraId: string;
  status: "active" | "completed" | "error";
  detections: Detection[];
  measurements: MeasurementResult[];
  startedAt: string;
  completedAt?: string;
}

export interface SessionSummary {
  id: string;
  itemCount: number;
  passCount: number;
  failCount: number;
  duration: number;
  createdAt: string;
}
