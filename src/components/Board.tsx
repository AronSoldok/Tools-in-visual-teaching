"use client";

import { useCallback, useEffect } from "react";
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
import { useState } from "react";
import { Toolbar } from "./Toolbar";
import { PlaceValueChart } from "./PlaceValueChart";
import { Workspace } from "./Workspace";
import { NumberDisplay } from "./NumberDisplay";
import { AnnotationLayer } from "./annotations/AnnotationLayer";
import { BlockSvg } from "./blocks/BlockSvg";
import { BLOCK_CONFIG, type BlockType } from "@/lib/blockTypes";
import { detectColumn } from "@/lib/snap";
import { useBoardStore } from "@/store/boardStore";

export function Board() {
  const [activeDrag, setActiveDrag] = useState<{
    id: string;
    type: BlockType;
    isPalette: boolean;
  } | null>(null);

  const activeTool = useBoardStore((s) => s.activeTool);
  const addBlockFromPalette = useBoardStore((s) => s.addBlockFromPalette);
  const moveBlock = useBoardStore((s) => s.moveBlock);
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
      const overId = over?.id;

      if (isPalette) {
        if (overId === "place-value-chart") {
          addBlockFromPalette(data.type, 0, 0, true);
        } else if (overId === "workspace") {
          const rect = document
            .querySelector(".workspace")
            ?.getBoundingClientRect();
          const x = rect ? rect.width / 2 - BLOCK_CONFIG[data.type].width / 2 : 200;
          const y = rect ? rect.height / 2 - BLOCK_CONFIG[data.type].height / 2 : 200;
          addBlockFromPalette(data.type, x, y, false);
        }
        return;
      }

      const blockId = String(active.id);
      const block = useBoardStore.getState().blocks.find((b) => b.id === blockId);
      if (!block) return;

      const newX = block.x + delta.x;
      const newY = block.y + delta.y;

      if (overId === "place-value-chart") {
        const column = detectColumn(newX, chartWidth);
        if (column) {
          moveBlock(blockId, newX, newY, column);
          return;
        }
      }

      if (overId === "workspace" || overId === "place-value-chart") {
        const column = overId === "workspace" ? "free" : block.column;
        moveBlock(blockId, newX, newY, column === "free" ? "free" : block.column);
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
        <main className="board-main">
          <aside className="board-sidebar">
            <PlaceValueChart />
          </aside>
          <section className="board-workspace-area">
            <Workspace />
            <AnnotationLayer />
          </section>
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
