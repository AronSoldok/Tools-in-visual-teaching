"use client";

import { create } from "zustand";
import { DRAW_COLORS } from "@/store/annotationStore";
import {
  generateProblem,
  type DigitCount,
  type MathOp,
  type MathProblem,
} from "@/lib/mathProblems";

export type GameKind = "tug" | "race" | "battle";
export type GamesScreen = "pick" | "setup" | "play";
export type Winner = "a" | "b" | "draw" | null;
export type TeamId = "a" | "b";
export type InputFlash = "ok" | "bad" | null;

export type GameSettings = {
  ops: MathOp[];
  digits: DigitCount;
  winScore: number;
  timerEnabled: boolean;
  timerSeconds: number;
};

export type TeamState = {
  name: string;
  color: string;
  score: number;
  problem: MathProblem;
  input: string;
  flash: InputFlash;
};

export const TEAM_COLORS = DRAW_COLORS.filter((c) => c.id !== "black");

const DEFAULT_SETTINGS: GameSettings = {
  ops: ["+", "-"],
  digits: 1,
  winScore: 5,
  timerEnabled: false,
  timerSeconds: 120,
};

function freshTeam(name: string, color: string, settings: GameSettings): TeamState {
  return {
    name,
    color,
    score: 0,
    problem: generateProblem(settings.ops, settings.digits),
    input: "",
    flash: null,
  };
}

interface GamesState {
  screen: GamesScreen;
  setupStep: number;
  kind: GameKind | null;
  settings: GameSettings;
  teamA: TeamState;
  teamB: TeamState;
  remainingSeconds: number | null;
  winner: Winner;
  lastCorrect: TeamId | null;
  lastCorrectAt: number;

  selectGame: (kind: GameKind) => void;
  backToPick: () => void;
  setSetupStep: (step: number) => void;
  toggleOp: (op: MathOp) => void;
  setDigits: (digits: DigitCount) => void;
  setWinScore: (n: number) => void;
  setTimerEnabled: (on: boolean) => void;
  setTimerSeconds: (seconds: number) => void;
  setTeamName: (id: TeamId, name: string) => void;
  setTeamColor: (id: TeamId, color: string) => void;
  startMatch: () => void;
  replay: () => void;
  typeDigit: (id: TeamId, digit: string) => void;
  backspace: (id: TeamId) => void;
  submit: (id: TeamId) => void;
  clearFlash: (id: TeamId) => void;
  tickTimer: () => void;
}

function patchTeam(
  state: Pick<GamesState, "teamA" | "teamB">,
  id: TeamId,
  patch: Partial<TeamState>,
) {
  if (id === "a") return { teamA: { ...state.teamA, ...patch } };
  return { teamB: { ...state.teamB, ...patch } };
}

export const useGamesStore = create<GamesState>((set, get) => ({
  screen: "pick",
  setupStep: 0,
  kind: null,
  settings: { ...DEFAULT_SETTINGS },
  teamA: freshTeam("Команда 1", "#2563eb", DEFAULT_SETTINGS),
  teamB: freshTeam("Команда 2", "#dc2626", DEFAULT_SETTINGS),
  remainingSeconds: null,
  winner: null,
  lastCorrect: null,
  lastCorrectAt: 0,

  selectGame: (kind) => set({ kind, screen: "setup", setupStep: 0, winner: null }),

  backToPick: () =>
    set({
      screen: "pick",
      kind: null,
      setupStep: 0,
      winner: null,
      remainingSeconds: null,
      lastCorrect: null,
    }),

  setSetupStep: (setupStep) => set({ setupStep }),

  toggleOp: (op) =>
    set((s) => {
      const has = s.settings.ops.includes(op);
      if (has && s.settings.ops.length === 1) return s;
      const ops = has ? s.settings.ops.filter((x) => x !== op) : [...s.settings.ops, op];
      return { settings: { ...s.settings, ops } };
    }),

  setDigits: (digits) => set((s) => ({ settings: { ...s.settings, digits } })),

  setWinScore: (n) =>
    set((s) => ({
      settings: { ...s.settings, winScore: Math.min(99, Math.max(1, Math.round(n) || 1)) },
    })),

  setTimerEnabled: (timerEnabled) => set((s) => ({ settings: { ...s.settings, timerEnabled } })),

  setTimerSeconds: (seconds) =>
    set((s) => ({
      settings: {
        ...s.settings,
        timerSeconds: Math.min(99 * 60 + 59, Math.max(10, Math.round(seconds) || 10)),
      },
    })),

  setTeamName: (id, name) => set((s) => patchTeam(s, id, { name })),

  setTeamColor: (id, color) => set((s) => patchTeam(s, id, { color })),

  startMatch: () => {
    const { settings, teamA, teamB } = get();
    set({
      screen: "play",
      winner: null,
      lastCorrect: null,
      lastCorrectAt: 0,
      remainingSeconds: settings.timerEnabled ? settings.timerSeconds : null,
      teamA: freshTeam(teamA.name.trim() || "Команда 1", teamA.color, settings),
      teamB: freshTeam(teamB.name.trim() || "Команда 2", teamB.color, settings),
    });
  },

  replay: () => get().startMatch(),

  typeDigit: (id, digit) => {
    const { winner, teamA, teamB } = get();
    if (winner) return;
    const team = id === "a" ? teamA : teamB;
    if (team.input.length >= 6) return;
    set(patchTeam(get(), id, { input: team.input + digit, flash: null }));
  },

  backspace: (id) => {
    const { winner, teamA, teamB } = get();
    if (winner) return;
    const team = id === "a" ? teamA : teamB;
    set(patchTeam(get(), id, { input: team.input.slice(0, -1), flash: null }));
  },

  submit: (id) => {
    const { winner, settings, teamA, teamB } = get();
    if (winner) return;
    const team = id === "a" ? teamA : teamB;
    const value = Number.parseInt(team.input, 10);
    if (team.input === "" || Number.isNaN(value)) {
      set(patchTeam(get(), id, { flash: "bad" }));
      return;
    }
    if (value !== team.problem.answer) {
      set(patchTeam(get(), id, { input: "", flash: "bad" }));
      return;
    }
    const score = team.score + 1;
    const won = score >= settings.winScore;
    set({
      ...patchTeam(get(), id, {
        score,
        input: "",
        flash: "ok",
        problem: generateProblem(settings.ops, settings.digits),
      }),
      lastCorrect: id,
      lastCorrectAt: Date.now(),
      winner: won ? id : null,
    });
  },

  clearFlash: (id) => set((s) => patchTeam(s, id, { flash: null })),

  tickTimer: () => {
    const { remainingSeconds, winner, teamA, teamB } = get();
    if (winner || remainingSeconds === null) return;
    const next = remainingSeconds - 1;
    if (next <= 0) {
      const result: Winner =
        teamA.score > teamB.score ? "a" : teamB.score > teamA.score ? "b" : "draw";
      set({ remainingSeconds: 0, winner: result });
      return;
    }
    set({ remainingSeconds: next });
  },
}));
