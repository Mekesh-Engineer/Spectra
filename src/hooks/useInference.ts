import { useState, useCallback } from "react";
import type { Detection } from "@shared/types/detection.types";
import { inferenceService } from "@/services/inferenceService";

export function useInference() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runInference = useCallback(async (imageData: string) => {
    setLoading(true);
    setError(null);
    try {
      const results = await inferenceService.detect(imageData);
      setDetections(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inference failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const clearDetections = useCallback(() => {
    setDetections([]);
  }, []);

  return { detections, loading, error, runInference, clearDetections };
}
