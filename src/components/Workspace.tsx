"use client";

import { useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { BlockGroup } from "@/lib/boardModes";
import { BLOCK_CONFIG, type BoardBlock } from "@/lib/blockTypes";
import { DraggableBlock } from "./blocks/DraggableBlock";
import { DecimalGrid } from "./DecimalGrid";
import { computeWorkspaceBlockScale } from "@/lib/blockScale";
import { useBoardStore } from "@/store/boardStore";

interface WorkspaceProps {
  group?: BlockGroup;
  droppableId?: string;
  className?: string;
}

const MARQUEE_THRESHOLD = 8;

function blockHitBox(block: BoardBlock, scale: number) {
  const type = block.partialShape ?? block.type;
  const { width, height } = BLOCK_CONFIG[type];
  return {
    left: block.x,
    top: block.y,
    right: block.x + width * scale,
    bottom: block.y + height * scale,
  };
}

function rectsOverlap(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function Workspace({
  group = "main",
  droppableId = "workspace",
  className = "",
}: WorkspaceProps) {
  const setSelectedBlockIds = useBoardStore((s) => s.setSelectedBlockIds);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const marqueeOriginRef = useRef<{ x: number; y: number } | null>(null);
  const marqueeRectRef = useRef<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const skipClickRef = useRef(false);
  const [marquee, setMarquee] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const blocks = useBoardStore((s) => s.blocks);
  const selectedBlockIds = useBoardStore((s) => s.selectedBlockIds);
  const clearSelection = useBoardStore((s) => s.clearSelection);
  const setWorkspaceSize = useBoardStore((s) => s.setWorkspaceSize);
  const workspaceWidth = useBoardStore((s) => s.workspaceWidth);
  const workspaceHeight = useBoardStore((s) => s.workspaceHeight);
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
  const scale = computeWorkspaceBlockScale(freeBlocks, workspaceWidth, workspaceHeight);

  const pointInWorkspace = (e: React.PointerEvent) => {
    const el = workspaceRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (activeTool !== "select" || e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest(".draggable-block") || target.closest(".decimal-grid")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    marqueeOriginRef.current = pointInWorkspace(e);
    marqueeRectRef.current = null;
    setMarquee(null);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const origin = marqueeOriginRef.current;
    if (!origin) return;
    const point = pointInWorkspace(e);
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;
    if (Math.hypot(dx, dy) < MARQUEE_THRESHOLD && !marqueeRectRef.current) return;
    const next = {
      left: Math.min(origin.x, point.x),
      top: Math.min(origin.y, point.y),
      width: Math.abs(dx),
      height: Math.abs(dy),
    };
    marqueeRectRef.current = next;
    setMarquee(next);
  };

  const handlePointerUp = () => {
    const origin = marqueeOriginRef.current;
    const rect = marqueeRectRef.current;
    marqueeOriginRef.current = null;
    marqueeRectRef.current = null;
    if (!origin || !rect) {
      setMarquee(null);
      return;
    }
    const box = {
      left: rect.left,
      top: rect.top,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
    };
    const ids = freeBlocks
      .filter((block) => rectsOverlap(box, blockHitBox(block, scale)))
      .map((block) => block.id);
    skipClickRef.current = true;
    setSelectedBlockIds(ids);
    setMarquee(null);
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        workspaceRef.current = node;
      }}
      className={`workspace ${className} ${isOver ? "drop-over" : ""}`}
      aria-label="Рабочая область"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={() => {
        if (skipClickRef.current) {
          skipClickRef.current = false;
          return;
        }
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
            scale={scale}
          />
        </div>
      ))}
      {marquee && (
        <div
          className="workspace-marquee"
          style={{
            left: marquee.left,
            top: marquee.top,
            width: marquee.width,
            height: marquee.height,
          }}
        />
      )}
    </div>
  );
}
