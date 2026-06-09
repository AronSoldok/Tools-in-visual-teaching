"use client";

import { create } from "zustand";
import {
  type BoardBlock,
  type BlockType,
  type PlaceColumn,
  type TextAnnotation,
  type ToolMode,
  createBlockId,
} from "@/lib/blockTypes";
import { composeAll, decomposeBlock } from "@/lib/regroup";
import {
  columnForBlockType,
  getDefaultFreePosition,
  snapBlockToColumn,
} from "@/lib/snap";

interface BoardState {
  blocks: BoardBlock[];
  selectedBlockId: string | null;
  activeTool: ToolMode;
  textAnnotations: TextAnnotation[];
  chartWidth: number;
  chartHeight: number;
  workspaceWidth: number;
  workspaceHeight: number;
  isFullscreen: boolean;

  setChartSize: (width: number, height: number) => void;
  setWorkspaceSize: (width: number, height: number) => void;
  setActiveTool: (tool: ToolMode) => void;
  setSelectedBlockId: (id: string | null) => void;
  setFullscreen: (value: boolean) => void;

  addBlockFromPalette: (type: BlockType, x: number, y: number, inChart: boolean) => void;
  moveBlock: (id: string, x: number, y: number, column?: PlaceColumn) => void;
  removeBlock: (id: string) => void;
  clearAnimating: () => void;

  composeBlocks: () => void;
  decomposeSelected: () => void;

  addTextAnnotation: (x: number, y: number, text: string) => void;
  updateTextAnnotation: (id: string, text: string) => void;
  removeTextAnnotation: (id: string) => void;

  clearDrawings: () => void;
  clearAll: () => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  blocks: [],
  selectedBlockId: null,
  activeTool: "select",
  textAnnotations: [],
  chartWidth: 280,
  chartHeight: 500,
  workspaceWidth: 800,
  workspaceHeight: 500,
  isFullscreen: false,

  setChartSize: (width, height) => set({ chartWidth: width, chartHeight: height }),
  setWorkspaceSize: (width, height) =>
    set({ workspaceWidth: width, workspaceHeight: height }),
  setActiveTool: (tool) => set({ activeTool: tool, selectedBlockId: null }),
  setSelectedBlockId: (id) => set({ selectedBlockId: id }),
  setFullscreen: (value) => set({ isFullscreen: value }),

  addBlockFromPalette: (type, x, y, inChart) => {
    const { blocks, chartWidth, chartHeight } = get();
    const freeCount = blocks.filter((b) => b.column === "free").length;

    let column: PlaceColumn = "free";
    let position = { x, y };

    if (inChart) {
      column = columnForBlockType(type);
      const block: BoardBlock = {
        id: createBlockId(),
        type,
        x: 0,
        y: 0,
        column,
      };
      position = snapBlockToColumn(block, column, chartWidth, chartHeight, blocks);
    } else {
      position = getDefaultFreePosition(type, freeCount);
    }

    const newBlock: BoardBlock = {
      id: createBlockId(),
      type,
      x: position.x,
      y: position.y,
      column,
    };

    set({ blocks: [...blocks, newBlock], selectedBlockId: newBlock.id });
  },

  moveBlock: (id, x, y, column) => {
    const { blocks, chartWidth, chartHeight } = get();
    set({
      blocks: blocks.map((b) => {
        if (b.id !== id) return b;
        const newColumn = column ?? b.column;
        if (newColumn !== "free" && column) {
          const snapped = snapBlockToColumn(
            { ...b, column: newColumn },
            newColumn as Exclude<PlaceColumn, "free">,
            chartWidth,
            chartHeight,
            blocks,
          );
          return { ...b, x: snapped.x, y: snapped.y, column: newColumn };
        }
        return { ...b, x, y, column: newColumn };
      }),
    });
  },

  removeBlock: (id) => {
    const { blocks, selectedBlockId } = get();
    set({
      blocks: blocks.filter((b) => b.id !== id),
      selectedBlockId: selectedBlockId === id ? null : selectedBlockId,
    });
  },

  clearAnimating: () => {
    set({
      blocks: get().blocks.map((b) => ({ ...b, animating: undefined })),
    });
  },

  composeBlocks: () => {
    const { blocks, chartWidth, chartHeight } = get();
    const result = composeAll(blocks, chartWidth, chartHeight);
    set({ blocks: result });
    setTimeout(() => get().clearAnimating(), 400);
  },

  decomposeSelected: () => {
    const { selectedBlockId, blocks, chartWidth, chartHeight } = get();
    if (!selectedBlockId) return;
    const result = decomposeBlock(blocks, selectedBlockId, chartWidth, chartHeight);
    set({ blocks: result, selectedBlockId: null });
    setTimeout(() => get().clearAnimating(), 400);
  },

  addTextAnnotation: (x, y, text) => {
    const id = `text-${Date.now()}`;
    set({
      textAnnotations: [
        ...get().textAnnotations,
        { id, x, y, text },
      ],
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

  clearDrawings: () => {
    set({ textAnnotations: [] });
  },

  clearAll: () => {
    set({ blocks: [], selectedBlockId: null, textAnnotations: [] });
  },
}));
