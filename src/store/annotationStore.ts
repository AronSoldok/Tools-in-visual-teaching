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
  setPenColor: (color: string) => void;
  setMarkerColor: (color: string) => void;
  getStrokeColor: (tool: ToolMode) => string;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  penColor: "#1e293b",
  markerColor: "#facc15",
  setPenColor: (color) => set({ penColor: color }),
  setMarkerColor: (color) => set({ markerColor: color }),
  getStrokeColor: (tool) => {
    const { penColor, markerColor } = get();
    if (tool === "pen") return penColor;
    if (tool === "highlighter") return markerColor;
    return penColor;
  },
}));
