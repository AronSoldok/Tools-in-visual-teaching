"use client";

import { getBlockModeConfig } from "@/lib/boardModes";
import { DraggableBlock } from "./blocks/DraggableBlock";
import type { BlockType } from "@/lib/blockTypes";
import { useBoardStore } from "@/store/boardStore";

const PALETTE_TYPES: BlockType[] = ["unit", "rod", "flat", "cube"];

export function BlockPalette() {
  const boardMode = useBoardStore((s) => s.boardMode);

  return (
    <div className="block-palette" aria-label="Палитра блоков">
      <span className="palette-label">Блоки</span>
      <div className="palette-items">
        {PALETTE_TYPES.map((type) => (
          <div key={type} className="palette-row">
            <DraggableBlock id={`palette-${type}`} type={type} isPalette />
            <span className="palette-name">
              {getBlockModeConfig(type, boardMode).labelRu}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
