"use client";

import { create } from "zustand";
import type { ToolMode } from "@/lib/blockTypes";

export const DRAW_COLORS = [
  { id: "black", value: "#1e293b", label: "Чёрный" },
  { id: "blue", value: "#2563eb", label: "Синий" },
  { id: "red", value: "#dc2626", label: "Красный" },
  { id: "green", value: "#16a34a", label: "Зелёный" },
  { id: "yellow", value: "#facc15", label: "Жёлтый" },
  { id: "orange", value: "#f97316", label: "Оранжевый" },
  { id: "purple", value: "#9333ea", label: "Фиолетовый" },
] as const;

interface AnnotationState {
  penColor: string;
  markerColor: string;
  eraserRadius: number;
  setPenColor: (color: string) => void;
  setMarkerColor: (color: string) => void;
  setEraserRadius: (radius: number) => void;
  getStrokeColor: (tool: ToolMode) => string;
}

export const ERASER_RADIUS_MIN = 16;
export const ERASER_RADIUS_MAX = 80;

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  penColor: "#1e293b",
  markerColor: "#facc15",
  eraserRadius: ERASER_RADIUS_MIN,
  setPenColor: (color) => set({ penColor: color }),
  setMarkerColor: (color) => set({ markerColor: color }),
  setEraserRadius: (radius) =>
    set({
      eraserRadius: Math.min(ERASER_RADIUS_MAX, Math.max(ERASER_RADIUS_MIN, radius)),
    }),
  getStrokeColor: (tool) => {
    const { penColor, markerColor } = get();
    if (tool === "pen") return penColor;
    if (tool === "highlighter") return markerColor;
    return penColor;
  },
}));
