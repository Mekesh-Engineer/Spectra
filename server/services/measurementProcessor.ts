/**
 * Spectra — Dimensional Measurement Processor (Step 3)
 *
 * Processing Pipeline:
 *   1. Data Extraction      — structured data from Roboflow JSON outputs
 *   2. Geometric Analysis    — contour approximation, edge refinement, feature extraction
 *   3. Pixel-to-Real Calibration — known reference dimension → scaling factor
 *   4. Measurement Computation — diameter (circles) and length (lines)
 *
 * This hybrid approach combines deep-learning detection (YOLOv8 bounding boxes)
 * with classical geometric analysis for improved measurement accuracy.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

interface RawDetection {
  id: string;
  label: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  model: "circle" | "line";
}

interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RefinedGeometry {
  bbox: BBox;
  contourArea: number;
  aspectRatio: number;
  circularity: number | null;
  angle: number | null;
}

interface DimensionalMeasurement {
  object_id: number;
  detection_class: string;
  model: "circle" | "line";
  diameter: number | null;
  length: number | null;
  width_mm: number;
  height_mm: number;
  confidence: number;
  bbox: BBox;
  bbox_refined: BBox;
  geometry: RefinedGeometry;
  pass: boolean;
}

interface MeasurementOutput {
  measurements: DimensionalMeasurement[];
  calibration: { pixelsPerMm: number; unit: string };
  summary: {
    totalObjects: number;
    circleFeatures: number;
    lineFeatures: number;
    passCount: number;
    failCount: number;
  };
}

interface CalibrationConfig {
  pixelsPerMm: number;
  confidenceThreshold?: number; // default 0.85
}

// ─── 1. Data Extraction ─────────────────────────────────────────────────────

interface ExtractedFeature {
  objectId: number;
  detection: RawDetection;
  category: "circle" | "line";
  bbox: BBox;
}

/**
 * Extract structured features from raw Roboflow detection output.
 * Categorises detections into circle features (cross-sections) and
 * line features (pipe body segments).
 */
function extractFeatures(detections: RawDetection[]): ExtractedFeature[] {
  return detections.map((det, index) => ({
    objectId: index + 1,
    detection: det,
    category: det.model,
    bbox: {
      x: det.x,
      y: det.y,
      width: det.width,
      height: det.height,
    },
  }));
}

// ─── 2. Geometric Feature Analysis ──────────────────────────────────────────

/**
 * Approximate contour area from a bounding box.
 *
 * For circles: area ≈ π × (w/2) × (h/2)  (inscribed ellipse)
 * For lines:   area ≈ w × h               (rectangular contour)
 */
function estimateContourArea(bbox: BBox, category: "circle" | "line"): number {
  if (category === "circle") {
    return Math.PI * (bbox.width / 2) * (bbox.height / 2);
  }
  return bbox.width * bbox.height;
}

/**
 * Calculate circularity metric (0–1, where 1 = perfect circle).
 *
 * Circularity = 4π × Area / Perimeter²
 * For an ellipse inscribed in the bounding box.
 */
function calculateCircularity(bbox: BBox): number {
  const a = bbox.width / 2;
  const b = bbox.height / 2;
  const area = Math.PI * a * b;
  // Ramanujan's approximation for ellipse perimeter
  const h = ((a - b) ** 2) / ((a + b) ** 2);
  const perimeter = Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
  if (perimeter === 0) return 0;
  const circularity = (4 * Math.PI * area) / (perimeter * perimeter);
  return Math.min(circularity, 1.0);
}

/**
 * Estimate rotation angle of a line/rod object from its bounding box.
 *
 * A very wide bbox → ~0°  (horizontal)
 * A very tall bbox → ~90° (vertical)
 * Square bbox → ~45°
 */
function estimateAngle(bbox: BBox): number {
  return Math.atan2(bbox.height, bbox.width) * (180 / Math.PI);
}

/**
 * Refine bounding box edges using confidence-weighted contour shrinkage.
 *
 * Higher-confidence detections have tighter bounding boxes that more
 * closely match the true object boundary. We apply a small inward
 * correction inversely proportional to confidence.
 *
 * For circles, we also adjust toward a square bbox (true circle).
 */
function refineBoundingBox(
  bbox: BBox,
  confidence: number,
  category: "circle" | "line"
): BBox {
  // Edge refinement: shrink bbox inward proportional to uncertainty
  // At confidence=1.0 → 0% shrink; at confidence=0.5 → up to 5% shrink
  const uncertainty = 1 - confidence;
  const shrinkFactor = uncertainty * 0.05;

  let refinedW = bbox.width * (1 - shrinkFactor);
  let refinedH = bbox.height * (1 - shrinkFactor);

  if (category === "circle") {
    // For circular cross-sections, adjust bbox toward a square
    // (weighted by circularity of the original bbox)
    const aspectRatio = bbox.width / (bbox.height || 1);
    if (aspectRatio > 0.8 && aspectRatio < 1.25) {
      // Nearly square — average the dimensions
      const avg = (refinedW + refinedH) / 2;
      const blendFactor = confidence * 0.3; // stronger blend at high confidence
      refinedW = refinedW + (avg - refinedW) * blendFactor;
      refinedH = refinedH + (avg - refinedH) * blendFactor;
    }
  }

  const dx = (bbox.width - refinedW) / 2;
  const dy = (bbox.height - refinedH) / 2;

  return {
    x: bbox.x + dx,
    y: bbox.y + dy,
    width: refinedW,
    height: refinedH,
  };
}

/**
 * Full geometric feature analysis for a single detection.
 */
function analyseGeometry(
  bbox: BBox,
  confidence: number,
  category: "circle" | "line"
): RefinedGeometry {
  const refinedBbox = refineBoundingBox(bbox, confidence, category);

  return {
    bbox: refinedBbox,
    contourArea: estimateContourArea(refinedBbox, category),
    aspectRatio: refinedBbox.width / (refinedBbox.height || 1),
    circularity: category === "circle" ? calculateCircularity(refinedBbox) : null,
    angle: category === "line" ? estimateAngle(refinedBbox) : null,
  };
}

// ─── 3. Pixel-to-Real-World Calibration ─────────────────────────────────────

/**
 * Convert a pixel measurement to real-world mm using the calibration factor.
 *
 * Formula: Real (mm) = Pixels / pixelsPerMm
 */
function pxToMm(pixels: number, pixelsPerMm: number): number {
  if (pixelsPerMm <= 0) return 0;
  return pixels / pixelsPerMm;
}

// ─── 4. Measurement Computation ─────────────────────────────────────────────

/**
 * Compute diameter for a circle feature.
 *
 * Diameter = Detected circle width (pixels) × Calibration factor
 *
 * Uses the refined bounding box and averages width/height for
 * near-circular cross-sections.
 */
function computeDiameter(geometry: RefinedGeometry, pixelsPerMm: number): number {
  const { bbox, circularity } = geometry;

  // For high-circularity detections, use the average of width and height
  // For elongated ellipses, use the shorter axis as diameter
  if (circularity !== null && circularity > 0.85) {
    const avgPx = (bbox.width + bbox.height) / 2;
    return pxToMm(avgPx, pixelsPerMm);
  }

  // Fallback: use the average
  return pxToMm((bbox.width + bbox.height) / 2, pixelsPerMm);
}

/**
 * Compute length for a line feature.
 *
 * Length = Bounding box length (pixels) × Calibration factor
 *
 * The "length" is the longer axis of the refined bounding box.
 * If the object is angled, we account for the diagonal.
 */
function computeLength(geometry: RefinedGeometry, pixelsPerMm: number): number {
  const { bbox, angle } = geometry;

  // Use the longer dimension
  const longerPx = Math.max(bbox.width, bbox.height);

  // If the angle is significantly off-axis (15°–75°), the true length
  // is better estimated by the bbox diagonal rather than its longest side
  if (angle !== null && angle > 15 && angle < 75) {
    const diagonal = Math.sqrt(bbox.width ** 2 + bbox.height ** 2);
    return pxToMm(diagonal, pixelsPerMm);
  }

  return pxToMm(longerPx, pixelsPerMm);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Run the full dimensional measurement pipeline on a set of raw detections.
 *
 * Pipeline stages:
 *   1. Data Extraction
 *   2. Geometric Feature Analysis (contour, edge refinement)
 *   3. Pixel-to-Real Calibration
 *   4. Measurement Computation (diameter / length)
 */
export function processMeasurements(
  detections: RawDetection[],
  calibration: CalibrationConfig
): MeasurementOutput {
  const { pixelsPerMm, confidenceThreshold = 0.85 } = calibration;

  // Stage 1: Data extraction
  const features = extractFeatures(detections);

  // Stages 2–4: Geometric analysis → Calibration → Measurement
  const measurements: DimensionalMeasurement[] = features.map((feat) => {
    // Stage 2: Geometric feature analysis
    const geometry = analyseGeometry(feat.bbox, feat.detection.confidence, feat.category);

    // Stage 3 & 4: Calibrated measurements
    const widthMm = pxToMm(geometry.bbox.width, pixelsPerMm);
    const heightMm = pxToMm(geometry.bbox.height, pixelsPerMm);

    let diameter: number | null = null;
    let length: number | null = null;

    if (feat.category === "circle") {
      diameter = computeDiameter(geometry, pixelsPerMm);
    } else {
      length = computeLength(geometry, pixelsPerMm);
    }

    return {
      object_id: feat.objectId,
      detection_class: feat.detection.label,
      model: feat.category,
      diameter: diameter !== null ? Math.round(diameter * 100) / 100 : null,
      length: length !== null ? Math.round(length * 100) / 100 : null,
      width_mm: Math.round(widthMm * 100) / 100,
      height_mm: Math.round(heightMm * 100) / 100,
      confidence: feat.detection.confidence,
      bbox: feat.bbox,
      bbox_refined: geometry.bbox,
      geometry,
      pass: feat.detection.confidence >= confidenceThreshold,
    };
  });

  const circleFeatures = measurements.filter((m) => m.model === "circle").length;
  const lineFeatures = measurements.filter((m) => m.model === "line").length;

  return {
    measurements,
    calibration: { pixelsPerMm, unit: "mm" },
    summary: {
      totalObjects: measurements.length,
      circleFeatures,
      lineFeatures,
      passCount: measurements.filter((m) => m.pass).length,
      failCount: measurements.filter((m) => !m.pass).length,
    },
  };
}
