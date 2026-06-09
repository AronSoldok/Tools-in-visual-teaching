"use client";

import { useCallback } from "react";
import { BlockPalette } from "./BlockPalette";
import { clearAnnotationCanvas } from "./annotations/AnnotationLayer";
import { useBoardStore } from "@/store/boardStore";
import type { ToolMode } from "@/lib/blockTypes";

const TOOLS: { id: ToolMode; label: string; icon: string }[] = [
  { id: "select", label: "Выбор", icon: "↖" },
  { id: "pen", label: "Ручка", icon: "✏" },
  { id: "highlighter", label: "Маркер", icon: "🖍" },
  { id: "text", label: "Текст", icon: "T" },
];

export function Toolbar() {
  const activeTool = useBoardStore((s) => s.activeTool);
  const setActiveTool = useBoardStore((s) => s.setActiveTool);
  const composeBlocks = useBoardStore((s) => s.composeBlocks);
  const decomposeSelected = useBoardStore((s) => s.decomposeSelected);
  const selectedBlockId = useBoardStore((s) => s.selectedBlockId);
  const clearAll = useBoardStore((s) => s.clearAll);
  const clearDrawings = useBoardStore((s) => s.clearDrawings);
  const isFullscreen = useBoardStore((s) => s.isFullscreen);
  const setFullscreen = useBoardStore((s) => s.setFullscreen);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setFullscreen(true);
      } else {
        await document.exitFullscreen();
        setFullscreen(false);
      }
    } catch {
      setFullscreen(false);
    }
  }, [setFullscreen]);

  const handleClearDrawings = () => {
    if (window.confirm("Очистить все рисунки и текст?")) {
      clearDrawings();
      clearAnnotationCanvas();
    }
  };

  const handleClearAll = () => {
    if (window.confirm("Очистить всё: блоки, рисунки и текст?")) {
      clearAll();
      clearAnnotationCanvas();
    }
  };

  return (
    <header className="toolbar">
      <div className="toolbar-section toolbar-palette">
        <BlockPalette />
      </div>

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
      </div>

      <div className="toolbar-section toolbar-actions">
        <button
          type="button"
          className="action-btn"
          onClick={composeBlocks}
          title="Собрать: 10 мелких → 1 крупный"
        >
          Собрать
        </button>
        <button
          type="button"
          className="action-btn"
          onClick={decomposeSelected}
          disabled={!selectedBlockId}
          title="Разобрать выбранный блок"
        >
          Разобрать
        </button>
        <button
          type="button"
          className="action-btn"
          onClick={handleClearDrawings}
          title="Очистить рисунки"
        >
          Очистить рисунки
        </button>
        <button
          type="button"
          className="action-btn danger"
          onClick={handleClearAll}
          title="Очистить всё"
        >
          Очистить всё
        </button>
        <button
          type="button"
          className="action-btn fullscreen-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Выйти из полноэкранного режима" : "Полный экран"}
        >
          {isFullscreen ? "⛶" : "⛶"} {isFullscreen ? "Выйти" : "Экран"}
        </button>
      </div>
    </header>
  );
}
