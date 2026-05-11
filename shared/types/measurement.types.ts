export interface MeasurementResult {
  label: string;
  value: number;
  unit: string;
  confidence: number;
}

export interface Calibration {
  pixelsPerUnit: number;
  unit: "mm" | "cm" | "in";
  referenceObjectId?: string;
}

export interface MeasurementRecord {
  id: string;
  sessionId: string;
  results: MeasurementResult[];
  calibration: Calibration;
  timestamp: string;
}

// ─── Step 3: Dimensional Measurement Types ──────────────────────────────────

/** Bounding box in pixel space (top-left origin) */
export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Refined contour geometry derived from geometric feature analysis */
export interface RefinedGeometry {
  /** Adjusted bounding box after contour / edge refinement */
  bbox: BBox;
  /** Estimated contour area in px² */
  contourArea: number;
  /** Aspect ratio (width / height) — 1.0 = perfect circle/square */
  aspectRatio: number;
  /** Circularity metric (0–1, 1 = perfect circle) — only for circle features */
  circularity: number | null;
  /** Estimated rotation angle in degrees (0–180) — for line features */
  angle: number | null;
}

/** A single object measurement produced by the processing pipeline */
export interface DimensionalMeasurement {
  object_id: number;
  detection_class: string;
  model: "circle" | "line";
  /** Real-world diameter in calibrated units (mm) — from circle model */
  diameter: number | null;
  /** Real-world length in calibrated units (mm) — from line model */
  length: number | null;
  /** Real-world width in calibrated units */
  width_mm: number;
  /** Real-world height in calibrated units */
  height_mm: number;
  /** Detection confidence (0–1) */
  confidence: number;
  /** Original bounding box from YOLO (px) */
  bbox: BBox;
  /** Refined bounding box after geometric analysis (px) */
  bbox_refined: BBox;
  /** Geometric analysis details */
  geometry: RefinedGeometry;
  /** Pass / fail based on confidence threshold */
  pass: boolean;
}

/** Full output of the dimensional measurement pipeline */
export interface MeasurementOutput {
  measurements: DimensionalMeasurement[];
  calibration: {
    pixelsPerMm: number;
    unit: string;
  };
  summary: {
    totalObjects: number;
    circleFeatures: number;
    lineFeatures: number;
    passCount: number;
    failCount: number;
  };
}
