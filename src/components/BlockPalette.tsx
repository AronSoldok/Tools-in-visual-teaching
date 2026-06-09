"use client";

import { DraggableBlock } from "./blocks/DraggableBlock";
import { BLOCK_CONFIG, type BlockType } from "@/lib/blockTypes";

const PALETTE_TYPES: BlockType[] = ["unit", "rod", "flat", "cube"];

export function BlockPalette() {
  return (
    <div className="block-palette" aria-label="Палитра блоков">
      <span className="palette-label">Блоки</span>
      <div className="palette-items">
        {PALETTE_TYPES.map((type) => (
          <div key={type} className="palette-row">
            <DraggableBlock
              id={`palette-${type}`}
              type={type}
              isPalette
            />
            <span className="palette-name">{BLOCK_CONFIG[type].labelRu}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
