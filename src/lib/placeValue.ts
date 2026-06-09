import { getBlockValue, type BoardMode } from "./boardModes";
import { BLOCK_CONFIG, type BlockType, type BoardBlock } from "./blockTypes";

export interface PlaceValueBreakdown {
  thousands: number;
  hundreds: number;
  tens: number;
  ones: number;
}

export function calculateTotal(
  blocks: BoardBlock[],
  mode: BoardMode = "whole",
): number {
  return blocks.reduce(
    (sum, block) => sum + getBlockValue(block.type, mode),
    0,
  );
}

export function formatNumber(value: number, mode: BoardMode = "whole"): string {
  if (mode === "decimal") {
    return value.toLocaleString("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }
  return value.toLocaleString("ru-RU");
}

export function getPlaceValueBreakdown(
  total: number,
  mode: BoardMode = "whole",
): PlaceValueBreakdown {
  if (mode === "decimal") {
    const rounded = Math.round(total * 100);
    const ones = rounded % 10;
    const tens = Math.floor(rounded / 10) % 10;
    const hundreds = Math.floor(rounded / 100) % 10;
    const thousands = Math.floor(rounded / 1000);
    return { thousands, hundreds, tens, ones };
  }

  const abs = Math.abs(Math.floor(total));
  return {
    thousands: Math.floor(abs / 1000) % 10,
    hundreds: Math.floor(abs / 100) % 10,
    tens: Math.floor(abs / 10) % 10,
    ones: abs % 10,
  };
}

export function formatBreakdown(
  breakdown: PlaceValueBreakdown,
  mode: BoardMode = "whole",
): string {
  if (mode === "decimal") {
    const parts: string[] = [];
    if (breakdown.thousands) parts.push(`${breakdown.thousands}×10`);
    if (breakdown.hundreds) parts.push(`${breakdown.hundreds}×1`);
    if (breakdown.tens) parts.push(`${breakdown.tens}×0,1`);
    if (breakdown.ones) parts.push(`${breakdown.ones}×0,01`);
    return parts.length ? parts.join(" + ") : "0";
  }

  const parts: string[] = [];
  if (breakdown.thousands) parts.push(`${breakdown.thousands}Т`);
  if (breakdown.hundreds) parts.push(`${breakdown.hundreds}С`);
  if (breakdown.tens) parts.push(`${breakdown.tens}Д`);
  if (breakdown.ones) parts.push(`${breakdown.ones}Е`);
  return parts.length ? parts.join(" ") : "0";
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

export type CompareResult = "greater" | "less" | "equal";

export function compareValues(a: number, b: number): CompareResult {
  if (a > b) return "greater";
  if (a < b) return "less";
  return "equal";
}

export function compareLabel(result: CompareResult): string {
  if (result === "greater") return ">";
  if (result === "less") return "<";
  return "=";
}

export function getBlockDimensionsForMode(type: BlockType) {
  return BLOCK_CONFIG[type];
}
