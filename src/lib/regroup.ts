import {
  BLOCK_CONFIG,
  createBlockId,
  getBlockCount,
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

const LARGER_TYPE: Partial<Record<BlockType, BlockType>> = {
  unit: "rod",
  rod: "flat",
  flat: "cube",
};

function blocksInColumn(blocks: BoardBlock[], column: PlaceColumn, type: BlockType) {
  return blocks.filter((b) => b.column === column && b.type === type);
}

function sumBlockCounts(blocks: BoardBlock[]): number {
  return blocks.reduce((sum, b) => sum + getBlockCount(b), 0);
}

function createPartialBlock(
  base: BoardBlock,
  type: BlockType,
  partialFill: number,
  partialShape: BlockType,
  chartWidth: number,
  chartHeight: number,
  existing: BoardBlock[],
): BoardBlock {
  const block: BoardBlock = {
    id: createBlockId(),
    type,
    column: base.column,
    x: base.x,
    y: base.y,
    group: base.group,
    animating: true,
    partialFill,
    partialShape,
  };

  if (base.column !== "free") {
    const pos = snapBlockToColumn(
      block,
      base.column as Exclude<PlaceColumn, "free">,
      chartWidth,
      chartHeight,
      existing,
    );
    block.x = pos.x;
    block.y = pos.y;
  }

  return block;
}

function createFullBlock(
  base: BoardBlock,
  type: BlockType,
  column: PlaceColumn,
  chartWidth: number,
  chartHeight: number,
  existing: BoardBlock[],
): BoardBlock {
  const block: BoardBlock = {
    id: createBlockId(),
    type,
    column,
    x: base.x,
    y: base.y,
    group: base.group,
    animating: true,
  };

  if (column !== "free") {
    const pos = snapBlockToColumn(
      block,
      column as Exclude<PlaceColumn, "free">,
      chartWidth,
      chartHeight,
      existing,
    );
    block.x = pos.x;
    block.y = pos.y;
  }

  return block;
}

export function composeSelected(
  blocks: BoardBlock[],
  selectedIds: string[],
  chartWidth: number,
  chartHeight: number,
): BoardBlock[] {
  if (selectedIds.length < 2) return blocks;

  const selected = blocks.filter((b) => selectedIds.includes(b.id));
  if (selected.length < 2) return blocks;

  const firstType = selected[0].type;
  const firstGroup = selected[0].group;
  const firstColumn = selected[0].column;

  if (
    !selected.every(
      (b) => b.type === firstType && b.group === firstGroup && b.column === firstColumn,
    )
  ) {
    return blocks;
  }

  if (firstType === "cube") return blocks;

  const largerType = LARGER_TYPE[firstType];
  if (!largerType) return blocks;

  const totalCount = sumBlockCounts(selected);
  if (totalCount < 2) return blocks;

  const removeIds = new Set(selectedIds);
  const result = blocks.filter((b) => !removeIds.has(b.id));
  const base = selected[0];

  const fullCount = Math.floor(totalCount / COMPOSE_THRESHOLD);
  const remainder = totalCount % COMPOSE_THRESHOLD;

  let targetColumn: PlaceColumn = base.column;
  if (base.column !== "free" && fullCount > 0) {
    const next = NEXT_COLUMN[base.column as Exclude<PlaceColumn, "free">];
    if (next) targetColumn = next;
  }

  for (let i = 0; i < fullCount; i++) {
    const newBlock = createFullBlock(
      base,
      largerType,
      targetColumn,
      chartWidth,
      chartHeight,
      result,
    );
    result.push(newBlock);
  }

  if (remainder >= 2) {
    result.push(
      createPartialBlock(
        base,
        firstType,
        remainder,
        largerType,
        chartWidth,
        chartHeight,
        result,
      ),
    );
  } else if (remainder === 1) {
    result.push(
      createFullBlock(base, firstType, base.column, chartWidth, chartHeight, result),
    );
  }

  return result;
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

  if (target.partialFill && target.partialShape) {
    const without = blocks.filter((b) => b.id !== blockId);
    const newBlocks: BoardBlock[] = [];
    for (let i = 0; i < target.partialFill; i++) {
      const block: BoardBlock = {
        id: createBlockId(),
        type: target.type,
        column: target.column,
        x: target.x + (i % 5) * (BLOCK_CONFIG[target.type].width + 2),
        y: target.y + Math.floor(i / 5) * (BLOCK_CONFIG[target.type].height + 2),
        group: target.group,
        animating: true,
      };
      newBlocks.push(block);
    }
    return [...without, ...newBlocks];
  }

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
