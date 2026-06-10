"use client";

import { useCallback } from "react";
import { BOARD_MODE_LABELS, type BoardMode } from "@/lib/boardModes";
import { exportBoardToPng } from "@/lib/exportBoard";
import { BlockPalette } from "./BlockPalette";
import { ColorPicker } from "./ColorPicker";
import { clearAnnotationCanvas } from "./annotations/AnnotationLayer";
import { useBoardStore } from "@/store/boardStore";
import type { ToolMode } from "@/lib/blockTypes";

const TOOLS: { id: ToolMode; label: string; icon: string }[] = [
  { id: "select", label: "Выбор", icon: "↖" },
  { id: "pen", label: "Ручка", icon: "✏" },
  { id: "highlighter", label: "Маркер", icon: "🖍" },
  { id: "text", label: "Текст", icon: "T" },
  { id: "eraser", label: "Ластик", icon: "⌫" },
];

const MODES: BoardMode[] = ["whole", "decimal", "comparison"];

export function Toolbar() {
  const activeTool = useBoardStore((s) => s.activeTool);
  const boardMode = useBoardStore((s) => s.boardMode);
  const setActiveTool = useBoardStore((s) => s.setActiveTool);
  const setBoardMode = useBoardStore((s) => s.setBoardMode);
  const composeBlocks = useBoardStore((s) => s.composeBlocks);
  const decomposeSelected = useBoardStore((s) => s.decomposeSelected);
  const deleteSelectedBlock = useBoardStore((s) => s.deleteSelectedBlock);
  const selectedBlockIds = useBoardStore((s) => s.selectedBlockIds);
  const clearAll = useBoardStore((s) => s.clearAll);
  const clearDrawings = useBoardStore((s) => s.clearDrawings);
  const isFullscreen = useBoardStore((s) => s.isFullscreen);
  const setFullscreen = useBoardStore((s) => s.setFullscreen);

  const hasSelection = selectedBlockIds.length > 0;

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

  const handleModeChange = (mode: BoardMode) => {
    if (mode === boardMode) return;
    if (
      useBoardStore.getState().blocks.length > 0 &&
      !window.confirm("Смена режима очистит доску. Продолжить?")
    ) {
      return;
    }
    setBoardMode(mode);
    clearAnnotationCanvas();
  };

  const handleExport = async () => {
    try {
      await exportBoardToPng();
    } catch {
      window.alert("Не удалось экспортировать изображение.");
    }
  };

  return (
    <header className="toolbar">
      <div className="toolbar-group">
        <span className="toolbar-group-label">Режим</span>
        <div className="toolbar-section toolbar-modes">
          {MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`mode-btn ${boardMode === mode ? "active" : ""}`}
              onClick={() => handleModeChange(mode)}
              aria-pressed={boardMode === mode}
            >
              {BOARD_MODE_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-group">
        <span className="toolbar-group-label">Блоки</span>
        <div className="toolbar-section toolbar-palette">
          <BlockPalette />
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

      <div className="toolbar-section toolbar-actions">
        <button
          type="button"
          className="action-btn"
          onClick={() => composeBlocks()}
          title="Собрать выделенные (2+) или колонки по 10"
        >
          Собрать
        </button>
        <button
          type="button"
          className="action-btn"
          onClick={decomposeSelected}
          disabled={!hasSelection}
          title="Разъединить выбранные блоки"
        >
          Разъединить
        </button>
        <button
          type="button"
          className="action-btn"
          onClick={deleteSelectedBlock}
          disabled={!hasSelection}
          title="Удалить выбранные блоки (Delete)"
        >
          Удалить
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
          className="action-btn"
          onClick={handleExport}
          title="Скачать PNG"
        >
          PNG
        </button>
        <button
          type="button"
          className="action-btn fullscreen-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Выйти из полноэкранного режима" : "Полный экран"}
        >
          {isFullscreen ? "Выйти" : "Экран"}
        </button>
      </div>
    </header>
  );
}
