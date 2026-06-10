"use client";

import { getBlockModeConfig } from "@/lib/boardModes";
import { BLOCK_CONFIG, type BlockType } from "@/lib/blockTypes";
import { DraggableBlock } from "./blocks/DraggableBlock";
import { useBoardStore } from "@/store/boardStore";

const PALETTE_TYPES: BlockType[] = ["unit", "rod", "flat", "cube"];

export function BlockPalette() {
  const boardMode = useBoardStore((s) => s.boardMode);

  return (
    <div className="block-palette" aria-label="Палитра блоков">
      <div className="palette-items">
        {PALETTE_TYPES.map((type) => {
          const config = getBlockModeConfig(type, boardMode);
          const value = BLOCK_CONFIG[type].value;
          return (
            <div key={type} className="palette-card">
              <DraggableBlock id={`palette-${type}`} type={type} isPalette />
              <span className="palette-value">{value >= 1000 ? "1000" : value}</span>
              <span className="palette-name">{config.labelRu}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
