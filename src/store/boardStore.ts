"use client";

import { create } from "zustand";
import type { BoardMode, BlockGroup } from "@/lib/boardModes";
import {
  type BoardBlock,
  type BlockType,
  type PlaceColumn,
  type TextAnnotation,
  type ToolMode,
  createBlockId,
} from "@/lib/blockTypes";
import { composeAll, composeSelected, decomposeBlock } from "@/lib/regroup";
import {
  columnForBlockType,
  getDefaultFreePosition,
  isValidBlockColumn,
  snapBlockToColumn,
} from "@/lib/snap";

const GRID_SIZE = 10;
const DECOMPOSE_TYPES: BlockType[] = ["unit", "rod", "flat", "cube"];

function emptyGrid(): boolean[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => false),
  );
}

interface BoardState {
  blocks: BoardBlock[];
  selectedBlockIds: string[];
  activeTool: ToolMode;
  boardMode: BoardMode;
  textAnnotations: TextAnnotation[];
  gridCells: boolean[][];
  chartWidth: number;
  chartHeight: number;
  workspaceWidth: number;
  workspaceHeight: number;
  isFullscreen: boolean;

  setChartSize: (width: number, height: number) => void;
  setWorkspaceSize: (width: number, height: number) => void;
  setActiveTool: (tool: ToolMode) => void;
  setBoardMode: (mode: BoardMode) => void;
  selectBlockExclusive: (id: string) => void;
  addBlockToSelection: (id: string) => void;
  clearSelection: () => void;
  setFullscreen: (value: boolean) => void;

  addBlockFromPalette: (
    type: BlockType,
    x: number,
    y: number,
    inChart: boolean,
    chartColumn?: PlaceColumn,
    group?: BlockGroup,
  ) => void;
  moveBlock: (id: string, x: number, y: number, column?: PlaceColumn) => void;
  removeBlock: (id: string) => void;
  deleteSelectedBlock: () => void;
  clearAnimating: () => void;

  composeBlocks: (group?: BlockGroup) => void;
  decomposeSelected: () => void;

  toggleGridCell: (row: number, col: number) => void;
  clearGrid: () => void;

  addTextAnnotation: (x: number, y: number, text: string) => void;
  updateTextAnnotation: (id: string, text: string) => void;
  removeTextAnnotation: (id: string) => void;

  clearDrawings: () => void;
  clearAll: () => void;

  getBlocksByGroup: (group: BlockGroup) => BoardBlock[];
}

export const useBoardStore = create<BoardState>((set, get) => ({
  blocks: [],
  selectedBlockIds: [],
  activeTool: "select",
  boardMode: "whole",
  textAnnotations: [],
  gridCells: emptyGrid(),
  chartWidth: 280,
  chartHeight: 500,
  workspaceWidth: 800,
  workspaceHeight: 500,
  isFullscreen: false,

  setChartSize: (width, height) => set({ chartWidth: width, chartHeight: height }),
  setWorkspaceSize: (width, height) =>
    set({ workspaceWidth: width, workspaceHeight: height }),
  setActiveTool: (tool) => set({ activeTool: tool, selectedBlockIds: [] }),
  setBoardMode: (mode) =>
    set({
      boardMode: mode,
      blocks: [],
      selectedBlockIds: [],
      gridCells: emptyGrid(),
    }),
  selectBlockExclusive: (id) => set({ selectedBlockIds: [id] }),
  addBlockToSelection: (id) => {
    const current = get().selectedBlockIds;
    if (current.includes(id)) return;
    set({ selectedBlockIds: [...current, id] });
  },
  clearSelection: () => set({ selectedBlockIds: [] }),
  setFullscreen: (value) => set({ isFullscreen: value }),

  getBlocksByGroup: (group) => {
    if (group === "main") {
      return get().blocks.filter((b) => b.group === "main" || !b.group);
    }
    return get().blocks.filter((b) => b.group === group);
  },

  addBlockFromPalette: (type, x, y, inChart, chartColumn, group = "main") => {
    const { blocks, chartWidth, chartHeight, boardMode } = get();
    const targetGroup = group;
    const groupBlocks = blocks.filter((b) => b.group === targetGroup);
    const freeCount = groupBlocks.filter((b) => b.column === "free").length;

    let column: PlaceColumn = "free";
    let position = { x, y };
    let invalid = false;

    if (inChart) {
      column =
        chartColumn && chartColumn !== "free"
          ? chartColumn
          : columnForBlockType(type, boardMode);
      invalid = !isValidBlockColumn(type, column, boardMode);

      const block: BoardBlock = {
        id: createBlockId(),
        type,
        x: 0,
        y: 0,
        column,
        group: targetGroup,
        invalid,
      };
      position = snapBlockToColumn(
        block,
        column as Exclude<PlaceColumn, "free">,
        chartWidth,
        chartHeight,
        blocks,
      );
    } else if (x >= 0 && y >= 0) {
      position = { x, y };
    } else {
      const offsetX = targetGroup === "b" ? 400 : 0;
      position = getDefaultFreePosition(type, freeCount, offsetX);
    }

    const newBlock: BoardBlock = {
      id: createBlockId(),
      type,
      x: position.x,
      y: position.y,
      column,
      group: targetGroup,
      invalid,
    };

    set({ blocks: [...blocks, newBlock], selectedBlockIds: [newBlock.id] });
  },

  moveBlock: (id, x, y, column) => {
    const { blocks, chartWidth, chartHeight, boardMode } = get();
    set({
      blocks: blocks.map((b) => {
        if (b.id !== id) return b;
        const newColumn = column ?? b.column;
        const invalid =
          newColumn !== "free" && !isValidBlockColumn(b.type, newColumn, boardMode);

        if (newColumn !== "free" && column) {
          const snapped = snapBlockToColumn(
            { ...b, column: newColumn },
            newColumn as Exclude<PlaceColumn, "free">,
            chartWidth,
            chartHeight,
            blocks,
          );
          return {
            ...b,
            x: snapped.x,
            y: snapped.y,
            column: newColumn,
            invalid,
          };
        }
        return { ...b, x, y, column: newColumn, invalid: false };
      }),
    });
  },

  removeBlock: (id) => {
    const { blocks, selectedBlockIds } = get();
    set({
      blocks: blocks.filter((b) => b.id !== id),
      selectedBlockIds: selectedBlockIds.filter((sid) => sid !== id),
    });
  },

  deleteSelectedBlock: () => {
    const { selectedBlockIds, blocks } = get();
    const removeSet = new Set(selectedBlockIds);
    set({
      blocks: blocks.filter((b) => !removeSet.has(b.id)),
      selectedBlockIds: [],
    });
  },

  clearAnimating: () => {
    set({
      blocks: get().blocks.map((b) => ({ ...b, animating: undefined })),
    });
  },

  composeBlocks: (group) => {
    const { blocks, chartWidth, chartHeight, boardMode, selectedBlockIds } = get();

    if (selectedBlockIds.length >= 2) {
      const result = composeSelected(blocks, selectedBlockIds, chartWidth, chartHeight);
      set({ blocks: result, selectedBlockIds: [] });
      setTimeout(() => get().clearAnimating(), 400);
      return;
    }

    if (boardMode === "comparison" && group) {
      const groupBlocks = blocks.filter((b) => b.group === group);
      const other = blocks.filter((b) => b.group !== group);
      const result = composeAll(groupBlocks, chartWidth, chartHeight);
      set({ blocks: [...other, ...result] });
    } else {
      const result = composeAll(blocks, chartWidth, chartHeight);
      set({ blocks: result });
    }
    setTimeout(() => get().clearAnimating(), 400);
  },

  decomposeSelected: () => {
    const { selectedBlockIds, blocks, chartWidth, chartHeight } = get();
    if (selectedBlockIds.length === 0) return;

    let result = blocks;
    for (const id of selectedBlockIds) {
      const block = result.find((b) => b.id === id);
      if (
        block &&
        (DECOMPOSE_TYPES.includes(block.type) || block.partialFill)
      ) {
        result = decomposeBlock(result, id, chartWidth, chartHeight);
      }
    }
    set({ blocks: result, selectedBlockIds: [] });
    setTimeout(() => get().clearAnimating(), 400);
  },

  toggleGridCell: (row, col) => {
    const grid = get().gridCells.map((r) => [...r]);
    grid[row][col] = !grid[row][col];
    set({ gridCells: grid });
  },

  clearGrid: () => set({ gridCells: emptyGrid() }),

  addTextAnnotation: (x, y, text) => {
    const id = `text-${Date.now()}`;
    set({
      textAnnotations: [...get().textAnnotations, { id, x, y, text }],
    });
  },

  updateTextAnnotation: (id, text) => {
    set({
      textAnnotations: get().textAnnotations.map((a) =>
        a.id === id ? { ...a, text } : a,
      ),
    });
  },

  removeTextAnnotation: (id) => {
    set({
      textAnnotations: get().textAnnotations.filter((a) => a.id !== id),
    });
  },

  clearDrawings: () => set({ textAnnotations: [] }),

  clearAll: () => {
    set({
      blocks: [],
      selectedBlockIds: [],
      textAnnotations: [],
      gridCells: emptyGrid(),
    });
  },
}));
