"use client";

import { create } from "zustand";
import type { ToolMode } from "@/lib/blockTypes";

export type MapViewMode = "flat" | "globe";
export type MapStyle = "physical" | "political";

export interface PieceTransform {
  x: number;
  y: number;
}

export interface MapTextAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
}

interface MapState {
  viewMode: MapViewMode;
  mapStyle: MapStyle;
  activeTool: ToolMode;
  pieceTransforms: Record<string, PieceTransform>;
  textAnnotations: MapTextAnnotation[];
  zoom: number;
  center: [number, number];

  setViewMode: (mode: MapViewMode) => void;
  setMapStyle: (style: MapStyle) => void;
  setActiveTool: (tool: ToolMode) => void;
  setPieceTransform: (id: string, transform: PieceTransform) => void;
  resetPieces: () => void;
  isPieceDragged: (id: string) => boolean;
  setZoom: (zoom: number) => void;
  setCenter: (center: [number, number]) => void;
  resetView: () => void;
  addTextAnnotation: (x: number, y: number, text: string) => void;
  removeTextAnnotation: (id: string) => void;
  clearDrawings: () => void;
}

const DEFAULT_ZOOM = 1;
const DEFAULT_CENTER: [number, number] = [0, 0];

export const useMapStore = create<MapState>((set, get) => ({
  viewMode: "flat",
  mapStyle: "physical",
  activeTool: "select",
  pieceTransforms: {},
  textAnnotations: [],
  zoom: DEFAULT_ZOOM,
  center: DEFAULT_CENTER,

  setViewMode: (mode) => set({ viewMode: mode }),
  setMapStyle: (style) => set({ mapStyle: style }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setPieceTransform: (id, transform) =>
    set((state) => ({
      pieceTransforms: {
        ...state.pieceTransforms,
        [id]: transform,
      },
    })),
  resetPieces: () => set({ pieceTransforms: {} }),
  isPieceDragged: (id) => {
    const t = get().pieceTransforms[id];
    return !!t && (t.x !== 0 || t.y !== 0);
  },
  setZoom: (zoom) => set({ zoom: Math.min(8, Math.max(0.5, zoom)) }),
  setCenter: (center) => set({ center }),
  resetView: () => set({ zoom: DEFAULT_ZOOM, center: DEFAULT_CENTER }),
  addTextAnnotation: (x, y, text) => {
    const id = `map-text-${Date.now()}`;
    set((state) => ({
      textAnnotations: [...state.textAnnotations, { id, x, y, text }],
    }));
  },
  removeTextAnnotation: (id) =>
    set((state) => ({
      textAnnotations: state.textAnnotations.filter((a) => a.id !== id),
    })),
  clearDrawings: () => set({ textAnnotations: [] }),
}));
