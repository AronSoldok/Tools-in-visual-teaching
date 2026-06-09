import { BLOCK_CONFIG, type BoardBlock } from "./blockTypes";

export function calculateTotal(blocks: BoardBlock[]): number {
  return blocks.reduce((sum, block) => sum + BLOCK_CONFIG[block.type].value, 0);
}

export function formatNumber(value: number): string {
  return value.toLocaleString("ru-RU");
}

export function countBlocksByColumn(
  blocks: BoardBlock[],
  column: BoardBlock["column"],
  type?: BoardBlock["type"],
): number {
  return blocks.filter(
    (b) => b.column === column && (type ? b.type === type : true),
  ).length;
}
