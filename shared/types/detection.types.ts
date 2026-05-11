export interface OpenCVCircleData {
  contourArea: number;
  perimeter: number;
  circularity: number;
  ellipse: { center: number[]; axes: number[]; angle: number } | null;
  diameter_px: number | null;
  diameter_mm: number | null;
  center: number[] | null;
}

export interface OpenCVLineData {
  contourArea: number;
  perimeter: number;
  minAreaRect: { center: number[]; size: number[]; angle: number } | null;
  length_px: number | null;
  length_mm: number | null;
  thickness_px: number | null;
  thickness_mm: number | null;
  angle: number | null;
}

export interface Detection {
  id: string;
  label: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  opencv?: OpenCVCircleData | OpenCVLineData | null;
}

export interface DetectionFrame {
  timestamp: number;
  detections: Detection[];
  imageWidth: number;
  imageHeight: number;
}

export interface DetectionModel {
  id: string;
  name: string;
  version: string;
  provider: "roboflow" | "custom";
}
