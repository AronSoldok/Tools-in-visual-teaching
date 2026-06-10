"use client";

import { useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { getBlockModeConfig } from "@/lib/boardModes";
import { BlockSvg } from "./BlockSvg";
import { BLOCK_CONFIG, type BlockType } from "@/lib/blockTypes";
import { useBoardStore } from "@/store/boardStore";

interface DraggableBlockProps {
  id: string;
  type: BlockType;
  selected?: boolean;
  invalid?: boolean;
  isPalette?: boolean;
}

export function DraggableBlock({
  id,
  type,
  selected,
  invalid,
  isPalette,
}: DraggableBlockProps) {
  const boardMode = useBoardStore((s) => s.boardMode);
  const block = useBoardStore((s) => s.blocks.find((b) => b.id === id));
  const selectBlockExclusive = useBoardStore((s) => s.selectBlockExclusive);
  const addBlockToSelection = useBoardStore((s) => s.addBlockToSelection);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { type, isPalette },
    disabled: false,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 1000 : undefined,
        opacity: isDragging ? 0.85 : 1,
      }
    : undefined;

  const label = isPalette
    ? getBlockModeConfig(type, boardMode).labelRu
    : BLOCK_CONFIG[type].labelRu;

  const handleClick = (e: React.MouseEvent) => {
    if (isPalette) return;
    e.stopPropagation();
    if (clickTimerRef.current) return;
    clickTimerRef.current = setTimeout(() => {
      selectBlockExclusive(id);
      clickTimerRef.current = null;
    }, 250);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isPalette) return;
    e.stopPropagation();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    addBlockToSelection(id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`draggable-block ${isPalette ? "palette-item" : "board-block"} ${selected ? "selected" : ""} ${invalid ? "invalid" : ""}`}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={invalid ? "Неверный разряд для этого блока" : label}
    >
      <BlockSvg
        type={type}
        selected={selected}
        mini={isPalette}
        partialFill={block?.partialFill}
        partialShape={block?.partialShape}
      />
    </div>
  );
}
