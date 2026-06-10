"use client";

import { ColorPicker } from "@/components/ColorPicker";
import type { ToolMode } from "@/lib/blockTypes";
import { useMapStore, type MapStyle, type MapViewMode } from "@/store/mapStore";
import { clearMapAnnotationCanvas } from "./MapAnnotationLayer";

const TOOLS: { id: ToolMode; label: string; icon: string }[] = [
  { id: "select", label: "Выбор", icon: "↖" },
  { id: "pen", label: "Ручка", icon: "✏" },
  { id: "highlighter", label: "Маркер", icon: "🖍" },
  { id: "text", label: "Текст", icon: "T" },
  { id: "eraser", label: "Ластик", icon: "⌫" },
];

export function MapToolbar() {
  const viewMode = useMapStore((s) => s.viewMode);
  const mapStyle = useMapStore((s) => s.mapStyle);
  const activeTool = useMapStore((s) => s.activeTool);
  const setViewMode = useMapStore((s) => s.setViewMode);
  const setMapStyle = useMapStore((s) => s.setMapStyle);
  const setActiveTool = useMapStore((s) => s.setActiveTool);
  const resetPieces = useMapStore((s) => s.resetPieces);
  const clearDrawings = useMapStore((s) => s.clearDrawings);
  const zoom = useMapStore((s) => s.zoom);
  const setZoom = useMapStore((s) => s.setZoom);
  const resetView = useMapStore((s) => s.resetView);

  const handleClearDrawings = () => {
    if (window.confirm("Очистить рисунки на карте?")) {
      clearDrawings();
      clearMapAnnotationCanvas();
    }
  };

  const handleResetPieces = () => {
    if (window.confirm("Вернуть все части карты на место?")) {
      resetPieces();
    }
  };

  return (
    <header className="toolbar map-toolbar">
      <div className="toolbar-group">
        <span className="toolbar-group-label">Вид</span>
        <div className="toolbar-section">
          {(["flat", "globe"] as MapViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`mode-btn ${viewMode === mode ? "active" : ""}`}
              onClick={() => setViewMode(mode)}
              aria-pressed={viewMode === mode}
            >
              {mode === "flat" ? "Плоская" : "Глобус"}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-group">
        <span className="toolbar-group-label">Карта</span>
        <div className="toolbar-section">
          {(["physical", "political"] as MapStyle[]).map((style) => (
            <button
              key={style}
              type="button"
              className={`mode-btn ${mapStyle === style ? "active" : ""}`}
              onClick={() => setMapStyle(style)}
              aria-pressed={mapStyle === style}
            >
              {style === "physical" ? "Физическая" : "Геополитическая"}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-group">
        <span className="toolbar-group-label">Инструменты</span>
        <div className="toolbar-section toolbar-tools">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className={`tool-btn ${activeTool === tool.id ? "active" : ""}`}
              onClick={() => setActiveTool(tool.id)}
              title={tool.label}
              aria-pressed={activeTool === tool.id}
            >
              <span className="tool-icon">{tool.icon}</span>
              <span className="tool-label">{tool.label}</span>
            </button>
          ))}
          <ColorPicker activeTool={activeTool} />
        </div>
      </div>

      {viewMode === "flat" && (
        <div className="toolbar-group">
          <span className="toolbar-group-label">Масштаб</span>
          <div className="toolbar-section map-zoom-controls">
            <button
              type="button"
              className="mode-btn"
              onClick={() => setZoom(zoom / 1.25)}
              title="Уменьшить"
              aria-label="Уменьшить"
            >
              −
            </button>
            <span className="map-zoom-value">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="mode-btn"
              onClick={() => setZoom(zoom * 1.25)}
              title="Увеличить"
              aria-label="Увеличить"
            >
              +
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={resetView}
              title="Сбросить масштаб"
            >
              Сброс
            </button>
          </div>
        </div>
      )}

      <div className="toolbar-section toolbar-actions">
        <button type="button" className="action-btn" onClick={handleClearDrawings}>
          Очистить рисунки
        </button>
        {viewMode === "flat" && (
          <button
            type="button"
            className="action-btn"
            onClick={handleResetPieces}
          >
            Сбросить карту
          </button>
        )}
      </div>
    </header>
  );
}
