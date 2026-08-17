import { getBlockValue, getExpectedColumn, type BoardMode } from "./boardModes";
import {
  BLOCK_CONFIG,
  getBlockCount,
  type BlockType,
  type BoardBlock,
} from "./blockTypes";

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
    (sum, block) => sum + getBlockValue(block.type, mode) * getBlockCount(block),
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

export const TARGET_MIN = 1;
export const TARGET_MAX = 9999;

export function randomWholeNumber(): number {
  return Math.floor(Math.random() * TARGET_MAX) + TARGET_MIN;
}

export function parseTargetNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < TARGET_MIN || value > TARGET_MAX) {
    return null;
  }
  return value;
}

export function getBreakdownParts(
  breakdown: PlaceValueBreakdown,
  mode: BoardMode = "whole",
): string[] {
  if (mode === "decimal") {
    const parts: string[] = [];
    if (breakdown.thousands) parts.push(`${breakdown.thousands}×10`);
    if (breakdown.hundreds) parts.push(`${breakdown.hundreds}×1`);
    if (breakdown.tens) parts.push(`${breakdown.tens}×0,1`);
    if (breakdown.ones) parts.push(`${breakdown.ones}×0,01`);
    return parts;
  }

  const parts: string[] = [];
  if (breakdown.thousands) parts.push(`${breakdown.thousands}тыс.`);
  if (breakdown.hundreds) parts.push(`${breakdown.hundreds}сот.`);
  if (breakdown.tens) parts.push(`${breakdown.tens}дес.`);
  if (breakdown.ones) parts.push(`${breakdown.ones}ед.`);
  return parts;
}

export function formatBreakdown(
  breakdown: PlaceValueBreakdown,
  mode: BoardMode = "whole",
): string {
  const parts = getBreakdownParts(breakdown, mode);
  if (!parts.length) return "0";
  return mode === "decimal" ? parts.join(" + ") : parts.join(" ");
}

export function formatBreakdownEquation(
  breakdown: PlaceValueBreakdown,
  total: number,
  mode: BoardMode = "whole",
): string {
  const parts = getBreakdownParts(breakdown, mode);
  const sum = formatNumber(total, mode);
  if (!parts.length) return `0 = ${sum}`;
  return `${parts.join(" + ")} = ${sum}`;
}

export function countBlocksByType(blocks: BoardBlock[]): PlaceValueBreakdown {
  const counts: PlaceValueBreakdown = {
    thousands: 0,
    hundreds: 0,
    tens: 0,
    ones: 0,
  };

  for (const block of blocks) {
    const n = getBlockCount(block);
    if (block.type === "cube") counts.thousands += n;
    else if (block.type === "flat") counts.hundreds += n;
    else if (block.type === "rod") counts.tens += n;
    else counts.ones += n;
  }

  return counts;
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

export function countBlocksInColumn(
  blocks: BoardBlock[],
  column: BoardBlock["column"],
): number {
  return countBlocksByColumn(blocks, column);
}

/** Count blocks for a column; in comparison mode workspace blocks count by type. */
export function countBlocksForColumn(
  blocks: BoardBlock[],
  column: BoardBlock["column"],
  mode: BoardMode = "whole",
): number {
  if (mode === "comparison") {
    return blocks
      .filter((b) => b.column === "free" && getExpectedColumn(b.type, mode) === column)
      .reduce((sum, b) => sum + getBlockCount(b), 0);
  }
  return blocks
    .filter((b) => b.column === column)
    .reduce((sum, b) => sum + getBlockCount(b), 0);
}

export function getWorkspaceBlocksForColumn(
  blocks: BoardBlock[],
  column: BoardBlock["column"],
  mode: BoardMode = "whole",
): BoardBlock[] {
  if (mode === "comparison") {
    return blocks.filter(
      (b) => b.column === "free" && getExpectedColumn(b.type, mode) === column,
    );
  }
  return blocks.filter((b) => b.column === column);
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
