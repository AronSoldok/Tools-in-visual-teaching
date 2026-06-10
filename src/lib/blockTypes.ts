import type { BlockGroup } from "./boardModes";

export type { BlockGroup };
export type BlockType = "unit" | "rod" | "flat" | "cube";
export type PlaceColumn = "ones" | "tens" | "hundreds" | "thousands" | "free";
export type ToolMode = "select" | "pen" | "highlighter" | "text" | "eraser";

export const CELL_SIZE = 24;

export const BLOCK_CONFIG: Record<
  BlockType,
  {
    value: number;
    label: string;
    labelRu: string;
    color: string;
    border: string;
    width: number;
    height: number;
    column: PlaceColumn;
    smallerType: BlockType | null;
    largerType: BlockType | null;
  }
> = {
  unit: {
    value: 1,
    label: "Unit",
    labelRu: "Единица",
    color: "#f5d547",
    border: "#c9a800",
    width: CELL_SIZE,
    height: CELL_SIZE,
    column: "ones",
    smallerType: null,
    largerType: "rod",
  },
  rod: {
    value: 10,
    label: "Rod",
    labelRu: "Десяток",
    color: "#6bc96b",
    border: "#3d9a3d",
    width: CELL_SIZE * 10,
    height: CELL_SIZE,
    column: "tens",
    smallerType: "unit",
    largerType: "flat",
  },
  flat: {
    value: 100,
    label: "Flat",
    labelRu: "Сотня",
    color: "#5b9bd5",
    border: "#2e6da4",
    width: CELL_SIZE * 10,
    height: CELL_SIZE * 10,
    column: "hundreds",
    smallerType: "rod",
    largerType: "cube",
  },
  cube: {
    value: 1000,
    label: "Cube",
    labelRu: "Тысяча",
    color: "#e07b39",
    border: "#b85c1f",
    width: CELL_SIZE * 10,
    height: CELL_SIZE * 10,
    column: "thousands",
    smallerType: "flat",
    largerType: null,
  },
};

export type ChartColumn = Exclude<PlaceColumn, "free">;

export const PLACE_COLUMNS: ChartColumn[] = [
  "thousands",
  "hundreds",
  "tens",
  "ones",
];

export const COLUMN_LABELS: Record<ChartColumn, string> = {
  thousands: "Тысячи",
  hundreds: "Сотни",
  tens: "Десятки",
  ones: "Единицы",
};

export const COLUMN_THEME: Record<
  ChartColumn,
  { bg: string; border: string; blockType: BlockType; valueLabel: string }
> = {
  thousands: { bg: "#fff0e6", border: "#e07b39", blockType: "cube", valueLabel: "1000" },
  hundreds: { bg: "#e8f4fc", border: "#5b9bd5", blockType: "flat", valueLabel: "100" },
  tens: { bg: "#e8f8e8", border: "#6bc96b", blockType: "rod", valueLabel: "10" },
  ones: { bg: "#fffbe6", border: "#f5d547", blockType: "unit", valueLabel: "1" },
};

export interface BoardBlock {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  column: PlaceColumn;
  group: BlockGroup;
  animating?: boolean;
  invalid?: boolean;
  /** 1–9 filled segments when merged but not a full regroup */
  partialFill?: number;
  /** Silhouette of the next larger block (rod / flat / cube) */
  partialShape?: BlockType;
}

export function getBlockCount(block: BoardBlock): number {
  if (block.partialFill) return block.partialFill;
  return 1;
}

export function getBlockEffectiveValue(block: BoardBlock): number {
  return BLOCK_CONFIG[block.type].value * getBlockCount(block);
}

export interface TextAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
}

export function createBlockId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getBlockDimensions(type: BlockType): { width: number; height: number } {
  const config = BLOCK_CONFIG[type];
  return { width: config.width, height: config.height };
}
