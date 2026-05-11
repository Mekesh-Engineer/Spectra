import { create } from "zustand";
import type { Detection } from "@shared/types/detection.types";
import type { MeasurementResult } from "@shared/types/measurement.types";

interface InspectionState {
  detections: Detection[];
  measurements: MeasurementResult[];
  isInspecting: boolean;
  setDetections: (detections: Detection[]) => void;
  setMeasurements: (measurements: MeasurementResult[]) => void;
  startInspection: () => void;
  stopInspection: () => void;
  reset: () => void;
}

export const useInspectionStore = create<InspectionState>((set) => ({
  detections: [],
  measurements: [],
  isInspecting: false,
  setDetections: (detections) => set({ detections }),
  setMeasurements: (measurements) => set({ measurements }),
  startInspection: () => set({ isInspecting: true }),
  stopInspection: () => set({ isInspecting: false }),
  reset: () => set({ detections: [], measurements: [], isInspecting: false }),
}));
