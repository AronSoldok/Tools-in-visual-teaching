"use client";

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
  onClick?: () => void;
}

export function DraggableBlock({
  id,
  type,
  selected,
  invalid,
  isPalette,
  onClick,
}: DraggableBlockProps) {
  const boardMode = useBoardStore((s) => s.boardMode);
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`draggable-block ${isPalette ? "palette-item" : "board-block"} ${selected ? "selected" : ""} ${invalid ? "invalid" : ""}`}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      title={invalid ? "Неверный разряд для этого блока" : label}
    >
      <BlockSvg type={type} selected={selected} />
    </div>
  );
}
