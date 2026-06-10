"use client";

import { create } from "zustand";

export type ActiveApp = "blocks" | "map";

interface AppState {
  activeApp: ActiveApp;
  setActiveApp: (app: ActiveApp) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeApp: "blocks",
  setActiveApp: (app) => set({ activeApp: app }),
}));
