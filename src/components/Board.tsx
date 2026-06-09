"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { BlockGroup } from "@/lib/boardModes";
import { getChartDropInfo, getDropPosition } from "@/lib/dndHelpers";
import type { BlockType } from "@/lib/blockTypes";
import { detectColumn } from "@/lib/snap";
import { useBoardStore } from "@/store/boardStore";
import { Toolbar } from "./Toolbar";
import { PlaceValueChart } from "./PlaceValueChart";
import { Workspace } from "./Workspace";
import { ComparisonBoard } from "./ComparisonBoard";
import { NumberDisplay } from "./NumberDisplay";
import { AnnotationLayer } from "./annotations/AnnotationLayer";
import { BlockSvg } from "./blocks/BlockSvg";

const CHART_SELECTORS: Record<string, string> = {
  "place-value-chart": ".place-value-chart",
  "chart-a": ".comparison-chart-a",
  "chart-b": ".comparison-chart-b",
};

const WORKSPACE_SELECTORS: Record<string, string> = {
  workspace: ".workspace:not(.comparison-workspace)",
  "workspace-a": ".comparison-workspace-a",
  "workspace-b": ".comparison-workspace-b",
};

const CHART_GROUPS: Record<string, BlockGroup> = {
  "place-value-chart": "main",
  "chart-a": "a",
  "chart-b": "b",
};

const WORKSPACE_GROUPS: Record<string, BlockGroup> = {
  workspace: "main",
  "workspace-a": "a",
  "workspace-b": "b",
};

export function Board() {
  const [activeDrag, setActiveDrag] = useState<{
    id: string;
    type: BlockType;
    isPalette: boolean;
  } | null>(null);

  const activeTool = useBoardStore((s) => s.activeTool);
  const boardMode = useBoardStore((s) => s.boardMode);
  const addBlockFromPalette = useBoardStore((s) => s.addBlockFromPalette);
  const moveBlock = useBoardStore((s) => s.moveBlock);
  const deleteSelectedBlock = useBoardStore((s) => s.deleteSelectedBlock);
  const chartWidth = useBoardStore((s) => s.chartWidth);
  const setFullscreen = useBoardStore((s) => s.setFullscreen);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
  );

  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [setFullscreen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (activeTool !== "select") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        e.preventDefault();
        deleteSelectedBlock();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTool, deleteSelectedBlock]);

  const handleDragStart = (event: DragStartEvent) => {
    if (activeTool !== "select") return;
    const { active } = event;
    const data = active.data.current as { type: BlockType; isPalette?: boolean };
    if (data?.type) {
      setActiveDrag({
        id: String(active.id),
        type: data.type,
        isPalette: !!data.isPalette,
      });
    }
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDrag(null);
      if (activeTool !== "select") return;

      const { active, over, delta } = event;
      const data = active.data.current as { type: BlockType; isPalette?: boolean };
      if (!data?.type) return;

      const isPalette = !!data.isPalette;
      const overId = over ? String(over.id) : null;

      if (isPalette) {
        if (overId && CHART_SELECTORS[overId]) {
          const info = getChartDropInfo(
            event,
            CHART_SELECTORS[overId],
            chartWidth,
            data.type,
          );
          const group = CHART_GROUPS[overId];
          addBlockFromPalette(
            data.type,
            info?.x ?? 0,
            info?.y ?? 0,
            true,
            info?.column ?? undefined,
            group,
          );
        } else if (overId && WORKSPACE_SELECTORS[overId]) {
          const pos = getDropPosition(event, WORKSPACE_SELECTORS[overId], data.type);
          const group = WORKSPACE_GROUPS[overId];
          if (pos) {
            addBlockFromPalette(data.type, pos.x, pos.y, false, undefined, group);
          }
        }
        return;
      }

      const blockId = String(active.id);
      const block = useBoardStore.getState().blocks.find((b) => b.id === blockId);
      if (!block) return;

      const newX = block.x + delta.x;
      const newY = block.y + delta.y;

      if (overId && CHART_SELECTORS[overId]) {
        const column = detectColumn(newX, chartWidth);
        if (column) {
          moveBlock(blockId, newX, newY, column);
          return;
        }
      }

      if (overId && WORKSPACE_SELECTORS[overId]) {
        moveBlock(blockId, newX, newY, "free");
      } else if (overId && CHART_SELECTORS[overId]) {
        moveBlock(blockId, newX, newY, block.column);
      } else {
        moveBlock(blockId, newX, newY, "free");
      }
    },
    [activeTool, addBlockFromPalette, moveBlock, chartWidth],
  );

  const dndDisabled = activeTool !== "select";

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={`board ${dndDisabled ? "dnd-disabled" : ""}`}>
        <Toolbar />
        <main className={`board-main ${boardMode === "comparison" ? "comparison-mode" : ""}`}>
          {boardMode === "comparison" ? (
            <section className="board-workspace-area comparison-workspaces">
              <ComparisonBoard />
              <AnnotationLayer />
            </section>
          ) : (
            <>
              <aside className="board-sidebar">
                <PlaceValueChart />
              </aside>
              <section className="board-workspace-area">
                <Workspace />
                <AnnotationLayer />
              </section>
            </>
          )}
        </main>
        <footer className="board-footer">
          <NumberDisplay />
        </footer>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDrag ? (
          <div className="drag-overlay-block">
            <BlockSvg type={activeDrag.type} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
