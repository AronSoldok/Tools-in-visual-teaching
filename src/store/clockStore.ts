"use client";

import { create } from "zustand";
import { pickClockFact } from "@/lib/clockFacts";
import {
  analogEqual,
  apply12hHour,
  randomTime,
  type ClockFormat,
  type ClockTime,
} from "@/lib/clockTime";

const FACTS_KEY = "tivt-clock-facts-enabled";

function readFactsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(FACTS_KEY);
  if (raw === null) return true;
  return raw !== "0";
}

export type ClockFeedback = { correct: boolean; fact: string | null };

interface ClockState {
  hours: number;
  minutes: number;
  format: ClockFormat;
  hourLocked: boolean;
  minuteLocked: boolean;
  digitalVisible: boolean;
  target: ClockTime | null;
  feedback: ClockFeedback | null;
  factsEnabled: boolean;
  lastFact: string | null;

  setTime: (hours: number, minutes: number) => void;
  setHours: (hours: number) => void;
  setMinutes: (minutes: number) => void;
  setHourFromPad: (hourValue: number) => void;
  setFormat: (format: ClockFormat) => void;
  toggleHourLock: () => void;
  toggleMinuteLock: () => void;
  toggleDigital: () => void;
  spawnTarget: () => void;
  clearTarget: () => void;
  confirmTarget: () => void;
  toggleFacts: () => void;
}

export const useClockStore = create<ClockState>((set, get) => ({
  hours: 0,
  minutes: 0,
  format: "12",
  hourLocked: false,
  minuteLocked: false,
  digitalVisible: true,
  target: null,
  feedback: null,
  factsEnabled: true,
  lastFact: null,

  setTime: (hours, minutes) =>
    set({
      hours: ((hours % 24) + 24) % 24,
      minutes: ((minutes % 60) + 60) % 60,
    }),
  setHours: (hours) => {
    if (get().hourLocked) return;
    set({ hours: ((hours % 24) + 24) % 24 });
  },
  setMinutes: (minutes) => {
    if (get().minuteLocked) return;
    set({ minutes: ((minutes % 60) + 60) % 60 });
  },
  setHourFromPad: (hourValue) => {
    if (get().hourLocked) return;
    const { format, hours } = get();
    const next = format === "12" ? apply12hHour(hourValue === 0 ? 12 : hourValue, hours) : hourValue;
    set({ hours: ((next % 24) + 24) % 24 });
  },
  setFormat: (format) => set({ format, feedback: null }),
  toggleHourLock: () => set({ hourLocked: !get().hourLocked }),
  toggleMinuteLock: () => set({ minuteLocked: !get().minuteLocked }),
  toggleDigital: () => set({ digitalVisible: !get().digitalVisible }),
  spawnTarget: () => {
    const next = randomTime(get().format);
    set({ target: next, feedback: null });
  },
  clearTarget: () => set({ target: null, feedback: null }),
  confirmTarget: () => {
    const { target, hours, minutes, factsEnabled, lastFact } = get();
    if (!target) return;
    const correct = analogEqual({ hours, minutes }, target);
    const fact = factsEnabled ? pickClockFact(lastFact) : null;
    set({
      target: null,
      feedback: { correct, fact },
      lastFact: fact,
    });
  },
  toggleFacts: () => {
    const next = !get().factsEnabled;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(FACTS_KEY, next ? "1" : "0");
    }
    set({ factsEnabled: next });
  },
}));

export function hydrateClockFactsPref() {
  useClockStore.setState({ factsEnabled: readFactsEnabled() });
}
