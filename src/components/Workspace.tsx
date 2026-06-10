"use client";

import { useEffect, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { BlockGroup } from "@/lib/boardModes";
import { DraggableBlock } from "./blocks/DraggableBlock";
import { DecimalGrid } from "./DecimalGrid";
import { useBoardStore } from "@/store/boardStore";

interface WorkspaceProps {
  group?: BlockGroup;
  droppableId?: string;
  className?: string;
}

export function Workspace({
  group = "main",
  droppableId = "workspace",
  className = "",
}: WorkspaceProps) {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const blocks = useBoardStore((s) => s.blocks);
  const selectedBlockIds = useBoardStore((s) => s.selectedBlockIds);
  const clearSelection = useBoardStore((s) => s.clearSelection);
  const setWorkspaceSize = useBoardStore((s) => s.setWorkspaceSize);
  const activeTool = useBoardStore((s) => s.activeTool);
  const boardMode = useBoardStore((s) => s.boardMode);

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { zone: "workspace", group },
    disabled: activeTool !== "select",
  });

  useEffect(() => {
    const el = workspaceRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWorkspaceSize(entry.contentRect.width, entry.contentRect.height);
      }
    });

    observer.observe(el);
    setWorkspaceSize(el.clientWidth, el.clientHeight);

    return () => observer.disconnect();
  }, [setWorkspaceSize, droppableId]);

  const freeBlocks = blocks.filter(
    (b) => b.group === group && b.column === "free",
  );

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        workspaceRef.current = node;
      }}
      className={`workspace ${className} ${isOver ? "drop-over" : ""}`}
      aria-label="Рабочая область"
      onClick={() => {
        if (activeTool === "select") clearSelection();
      }}
    >
      <div className="workspace-grid" />
      {boardMode === "decimal" && group === "main" && <DecimalGrid />}
      {freeBlocks.map((block) => (
        <div
          key={block.id}
          className={`workspace-block-wrapper comparison-block-wrapper ${block.animating ? "regroup-animate" : ""}`}
          style={{ left: block.x, top: block.y, position: "absolute" }}
        >
          <DraggableBlock
            id={block.id}
            type={block.type}
            selected={selectedBlockIds.includes(block.id)}
          />
        </div>
      ))}
    </div>
  );
}
