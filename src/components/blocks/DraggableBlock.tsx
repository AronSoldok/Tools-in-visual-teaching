"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { BlockSvg } from "./BlockSvg";
import { BLOCK_CONFIG, type BlockType } from "@/lib/blockTypes";

interface DraggableBlockProps {
  id: string;
  type: BlockType;
  selected?: boolean;
  isPalette?: boolean;
  onClick?: () => void;
}

export function DraggableBlock({
  id,
  type,
  selected,
  isPalette,
  onClick,
}: DraggableBlockProps) {
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

  const config = BLOCK_CONFIG[type];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`draggable-block ${isPalette ? "palette-item" : "board-block"} ${selected ? "selected" : ""}`}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      title={config.labelRu}
    >
      <BlockSvg type={type} selected={selected} />
    </div>
  );
}
