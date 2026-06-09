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

export interface BoardBlock {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  column: PlaceColumn;
  group: BlockGroup;
  animating?: boolean;
  invalid?: boolean;
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
