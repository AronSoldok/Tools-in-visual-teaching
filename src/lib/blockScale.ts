import { CELL_SIZE, type BoardBlock, type BlockType } from "./blockTypes";

const LARGE_TILE = CELL_SIZE * 10;
const TILE_GAP = 16;

export const BLOCK_SCALE_MIN = 0.4;
export const BLOCK_SCALE_MAX = 1;

function isLargeShape(type: BlockType): boolean {
  return type === "flat" || type === "cube";
}

export function isLargeWorkspaceBlock(block: BoardBlock): boolean {
  if (block.column !== "free") return false;
  return isLargeShape(block.partialShape ?? block.type);
}

export function countLargeWorkspaceBlocks(blocks: BoardBlock[]): number {
  return blocks.filter(isLargeWorkspaceBlock).length;
}

export function computeWorkspaceBlockScale(
  blocks: BoardBlock[],
  workspaceWidth: number,
  workspaceHeight: number,
  extraLarge = 0,
): number {
  const n = countLargeWorkspaceBlocks(blocks) + extraLarge;
  if (n <= 2) return BLOCK_SCALE_MAX;

  const w = Math.max(workspaceWidth, LARGE_TILE);
  const h = Math.max(workspaceHeight, LARGE_TILE);
  const cols = Math.max(1, Math.floor(w / (LARGE_TILE + TILE_GAP)));
  const rows = Math.max(1, Math.floor(h / (LARGE_TILE + TILE_GAP)));
  if (n <= cols * rows) return BLOCK_SCALE_MAX;

  const grid = Math.ceil(Math.sqrt(n));
  const scaleW = (w / grid - TILE_GAP) / LARGE_TILE;
  const scaleH = (h / grid - TILE_GAP) / LARGE_TILE;
  return Math.min(BLOCK_SCALE_MAX, Math.max(BLOCK_SCALE_MIN, Math.min(scaleW, scaleH)));
}
