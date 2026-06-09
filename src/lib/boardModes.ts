import type { BlockType, ChartColumn } from "./blockTypes";

export type BoardMode = "whole" | "decimal" | "comparison";

export type BlockGroup = "main" | "a" | "b";

export const BOARD_MODE_LABELS: Record<BoardMode, string> = {
  whole: "Целые числа",
  decimal: "Десятичные",
  comparison: "Сравнение",
};

export interface BlockModeConfig {
  value: number;
  column: ChartColumn;
  labelRu: string;
}

const WHOLE_VALUES: Record<BlockType, BlockModeConfig> = {
  unit: { value: 1, column: "ones", labelRu: "Единица" },
  rod: { value: 10, column: "tens", labelRu: "Десяток" },
  flat: { value: 100, column: "hundreds", labelRu: "Сотня" },
  cube: { value: 1000, column: "thousands", labelRu: "Тысяча" },
};

const DECIMAL_VALUES: Record<BlockType, BlockModeConfig> = {
  unit: { value: 0.01, column: "ones", labelRu: "0,01" },
  rod: { value: 0.1, column: "tens", labelRu: "0,1" },
  flat: { value: 1, column: "hundreds", labelRu: "1" },
  cube: { value: 10, column: "thousands", labelRu: "10" },
};

export function getBlockModeConfig(
  type: BlockType,
  mode: BoardMode,
): BlockModeConfig {
  if (mode === "decimal") return DECIMAL_VALUES[type];
  return WHOLE_VALUES[type];
}

export function getBlockValue(type: BlockType, mode: BoardMode): number {
  return getBlockModeConfig(type, mode).value;
}

export function getExpectedColumn(
  type: BlockType,
  mode: BoardMode,
): ChartColumn {
  return getBlockModeConfig(type, mode).column;
}
