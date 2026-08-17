"use client";

import {
  ERASER_RADIUS_MAX,
  ERASER_RADIUS_MIN,
  useAnnotationStore,
} from "@/store/annotationStore";
import type { ToolMode } from "@/lib/blockTypes";

export function EraserSizePicker({ activeTool }: { activeTool: ToolMode }) {
  const eraserRadius = useAnnotationStore((s) => s.eraserRadius);
  const setEraserRadius = useAnnotationStore((s) => s.setEraserRadius);

  if (activeTool !== "eraser") return null;

  return (
    <label className="eraser-size-picker">
      <span className="eraser-size-label">Размер</span>
      <input
        type="range"
        min={ERASER_RADIUS_MIN}
        max={ERASER_RADIUS_MAX}
        value={eraserRadius}
        onChange={(e) => setEraserRadius(Number(e.target.value))}
        aria-label="Размер ластика"
      />
      <span
        className="eraser-size-preview"
        style={{ width: eraserRadius, height: eraserRadius }}
        aria-hidden
      />
    </label>
  );
}
