"use client";

import { DRAW_COLORS, useAnnotationStore } from "@/store/annotationStore";
import type { ToolMode } from "@/lib/blockTypes";

interface ColorPickerProps {
  activeTool: ToolMode;
}

export function ColorPicker({ activeTool }: ColorPickerProps) {
  const penColor = useAnnotationStore((s) => s.penColor);
  const markerColor = useAnnotationStore((s) => s.markerColor);
  const setPenColor = useAnnotationStore((s) => s.setPenColor);
  const setMarkerColor = useAnnotationStore((s) => s.setMarkerColor);

  if (activeTool !== "pen" && activeTool !== "highlighter") return null;

  const currentColor = activeTool === "pen" ? penColor : markerColor;
  const setColor = activeTool === "pen" ? setPenColor : setMarkerColor;

  return (
    <div className="color-picker" aria-label="Цвет рисования">
      <span className="color-picker-label">Цвет:</span>
      <div className="color-picker-swatches">
        {DRAW_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`color-swatch ${currentColor === c.value ? "active" : ""}`}
            style={{ backgroundColor: c.value }}
            onClick={() => setColor(c.value)}
            title={c.label}
            aria-label={c.label}
            aria-pressed={currentColor === c.value}
          />
        ))}
      </div>
    </div>
  );
}
