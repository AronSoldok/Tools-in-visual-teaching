import {
  BLOCK_CONFIG,
  CELL_SIZE,
  type BoardBlock,
  type PlaceColumn,
} from "./blockTypes";

export interface ColumnLayout {
  column: Exclude<PlaceColumn, "free">;
  x: number;
  width: number;
}

const CHART_PADDING = 12;
const COLUMN_GAP = 8;

export function getColumnLayouts(chartWidth: number): ColumnLayout[] {
  const columns: Exclude<PlaceColumn, "free">[] = [
    "thousands",
    "hundreds",
    "tens",
    "ones",
  ];
  const innerWidth = chartWidth - CHART_PADDING * 2;
  const columnWidth = (innerWidth - COLUMN_GAP * 3) / 4;

  return columns.map((column, index) => ({
    column,
    x: CHART_PADDING + index * (columnWidth + COLUMN_GAP),
    width: columnWidth,
  }));
}

export function detectColumn(
  x: number,
  chartWidth: number,
): Exclude<PlaceColumn, "free"> | null {
  const layouts = getColumnLayouts(chartWidth);
  for (const layout of layouts) {
    if (x >= layout.x && x <= layout.x + layout.width) {
      return layout.column;
    }
  }
  return null;
}

export function snapBlockToColumn(
  block: BoardBlock,
  column: Exclude<PlaceColumn, "free">,
  chartWidth: number,
  chartHeight: number,
  existingBlocks: BoardBlock[],
): { x: number; y: number } {
  const layouts = getColumnLayouts(chartWidth);
  const layout = layouts.find((l) => l.column === column)!;
  const { width, height } = BLOCK_CONFIG[block.type];

  const columnBlocks = existingBlocks.filter(
    (b) => b.id !== block.id && b.column === column,
  );

  const maxPerRow = Math.max(
    1,
    Math.floor((layout.width - 8) / (width + 4)),
  );
  const index = columnBlocks.length;
  const row = Math.floor(index / maxPerRow);
  const col = index % maxPerRow;

  const x =
    layout.x +
    (layout.width - Math.min(maxPerRow, columnBlocks.length + 1) * (width + 4)) /
      2 +
    col * (width + 4);
  const y = chartHeight - CHART_PADDING - height - row * (height + 4);

  return { x: Math.max(layout.x + 4, x), y: Math.max(CHART_PADDING + 40, y) };
}

export function getDefaultFreePosition(
  type: BoardBlock["type"],
  index: number,
): { x: number; y: number } {
  const { width, height } = BLOCK_CONFIG[type];
  const col = index % 4;
  const row = Math.floor(index / 4);
  return {
    x: 320 + col * (width + 16),
    y: 80 + row * (height + 16),
  };
}

export function columnForBlockType(
  type: BoardBlock["type"],
): Exclude<PlaceColumn, "free"> {
  return BLOCK_CONFIG[type].column as Exclude<PlaceColumn, "free">;
}

export { CHART_PADDING, CELL_SIZE };
