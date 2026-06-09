import {
  BLOCK_CONFIG,
  createBlockId,
  type BoardBlock,
  type BlockType,
  type PlaceColumn,
} from "./blockTypes";
import { snapBlockToColumn } from "./snap";

const COMPOSE_THRESHOLD = 10;

const NEXT_COLUMN: Record<Exclude<PlaceColumn, "free">, Exclude<PlaceColumn, "free"> | null> = {
  ones: "tens",
  tens: "hundreds",
  hundreds: "thousands",
  thousands: null,
};

const PREV_COLUMN: Record<Exclude<PlaceColumn, "free">, Exclude<PlaceColumn, "free"> | null> = {
  ones: null,
  tens: "ones",
  hundreds: "tens",
  thousands: "hundreds",
};

function blocksInColumn(blocks: BoardBlock[], column: PlaceColumn, type: BlockType) {
  return blocks.filter((b) => b.column === column && b.type === type);
}

export function composeAll(
  blocks: BoardBlock[],
  chartWidth: number,
  chartHeight: number,
): BoardBlock[] {
  let result = [...blocks];
  let changed = true;

  while (changed) {
    changed = false;
    const columns: Exclude<PlaceColumn, "free">[] = ["ones", "tens", "hundreds"];

    for (const column of columns) {
      const types: BlockType[] = ["unit", "rod", "flat"];
      for (const type of types) {
        const config = BLOCK_CONFIG[type];
        if (!config.largerType) continue;

        const group = blocksInColumn(result, column, type);
        if (group.length < COMPOSE_THRESHOLD) continue;

        const targetColumn = NEXT_COLUMN[column];
        if (!targetColumn) continue;

        const toRemove = group.slice(0, COMPOSE_THRESHOLD);
        const removeIds = new Set(toRemove.map((b) => b.id));
        const blockGroup = toRemove[0].group;
        result = result.filter((b) => !removeIds.has(b.id));

        const newBlock: BoardBlock = {
          id: createBlockId(),
          type: config.largerType,
          column: targetColumn,
          x: 0,
          y: 0,
          group: blockGroup,
          animating: true,
        };

        const pos = snapBlockToColumn(
          newBlock,
          targetColumn,
          chartWidth,
          chartHeight,
          result,
        );
        newBlock.x = pos.x;
        newBlock.y = pos.y;
        result.push(newBlock);
        changed = true;
        break;
      }
      if (changed) break;
    }
  }

  return result;
}

export function decomposeBlock(
  blocks: BoardBlock[],
  blockId: string,
  chartWidth: number,
  chartHeight: number,
): BoardBlock[] {
  const target = blocks.find((b) => b.id === blockId);
  if (!target) return blocks;

  const config = BLOCK_CONFIG[target.type];
  if (!config.smallerType) return blocks;

  const smallerType = config.smallerType;
  const without = blocks.filter((b) => b.id !== blockId);
  const newBlocks: BoardBlock[] = [];

  let targetColumn: PlaceColumn = target.column;

  if (target.column !== "free") {
    const prev = PREV_COLUMN[target.column as Exclude<PlaceColumn, "free">];
    if (prev) targetColumn = prev;
  }

  for (let i = 0; i < COMPOSE_THRESHOLD; i++) {
    const block: BoardBlock = {
      id: createBlockId(),
      type: smallerType,
      column: targetColumn,
      x: 0,
      y: 0,
      group: target.group,
      animating: true,
    };

    if (targetColumn !== "free") {
      const pos = snapBlockToColumn(
        block,
        targetColumn as Exclude<PlaceColumn, "free">,
        chartWidth,
        chartHeight,
        [...without, ...newBlocks],
      );
      block.x = pos.x;
      block.y = pos.y;
    } else {
      block.x = target.x + (i % 5) * (BLOCK_CONFIG[smallerType].width + 2);
      block.y = target.y + Math.floor(i / 5) * (BLOCK_CONFIG[smallerType].height + 2);
    }

    newBlocks.push(block);
  }

  return [...without, ...newBlocks];
}
