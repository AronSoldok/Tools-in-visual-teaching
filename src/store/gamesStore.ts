"use client";

import { create } from "zustand";
import { DRAW_COLORS } from "@/store/annotationStore";
import {
  generateProblem,
  type DigitCount,
  type MathOp,
  type MathProblem,
} from "@/lib/mathProblems";

export type GameKind = "tug" | "race" | "battle" | "fight";
export type GamesScreen = "pick" | "setup" | "play";
export type Winner = "a" | "b" | "draw" | null;
export type TeamId = "a" | "b";
export type InputFlash = "ok" | "bad" | null;
export type FightPhase = "idle" | "windup" | "miss" | "grapple";
export type FightHitKind = "block" | "hit" | "punish" | "counter" | "grapple" | "recover";

export const FIGHT_MAX_HP = 100;
export const FIGHT_WINDOW_MS = 3000;
export const FIGHT_DMG = {
  block: 5,
  hit: 16,
  punish: 24,
  counter: 24,
  grapple: 20,
} as const;

export type FightHit = {
  kind: FightHitKind;
  from: TeamId;
  to: TeamId;
  at: number;
};

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
  hp: number;
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

const IDLE_FIGHT = {
  fightPhase: "idle" as FightPhase,
  fightActor: null as TeamId | null,
  fightUntil: 0,
  lastHit: null as FightHit | null,
};

function freshTeam(name: string, color: string, settings: GameSettings, hp = 0): TeamState {
  return {
    name,
    color,
    score: 0,
    hp,
    problem: generateProblem(settings.ops, settings.digits),
    input: "",
    flash: null,
  };
}

function other(id: TeamId): TeamId {
  return id === "a" ? "b" : "a";
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
  fightPhase: FightPhase;
  fightActor: TeamId | null;
  fightUntil: number;
  lastHit: FightHit | null;

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
  tickFight: () => void;
}

function patchTeam(
  state: Pick<GamesState, "teamA" | "teamB">,
  id: TeamId,
  patch: Partial<TeamState>,
) {
  if (id === "a") return { teamA: { ...state.teamA, ...patch } };
  return { teamB: { ...state.teamB, ...patch } };
}

function applyDamage(
  state: Pick<GamesState, "teamA" | "teamB" | "winner">,
  target: TeamId,
  amount: number,
) {
  const current = target === "a" ? state.teamA : state.teamB;
  const hp = Math.max(0, current.hp - amount);
  const next = { ...current, hp };
  return {
    teamA: target === "a" ? next : state.teamA,
    teamB: target === "b" ? next : state.teamB,
    winner: (hp <= 0 ? other(target) : state.winner) as Winner,
  };
}

function withTeam(
  teams: Pick<GamesState, "teamA" | "teamB">,
  id: TeamId,
  patch: Partial<TeamState>,
) {
  if (id === "a") return { teamA: { ...teams.teamA, ...patch }, teamB: teams.teamB };
  return { teamA: teams.teamA, teamB: { ...teams.teamB, ...patch } };
}

function fightLocked(state: Pick<GamesState, "kind" | "fightPhase" | "fightActor">, id: TeamId) {
  if (state.kind !== "fight") return false;
  if (state.fightPhase !== "windup" && state.fightPhase !== "miss") return false;
  return state.fightActor === id;
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
  ...IDLE_FIGHT,

  selectGame: (kind) => set({ kind, screen: "setup", setupStep: 0, winner: null, ...IDLE_FIGHT }),

  backToPick: () =>
    set({
      screen: "pick",
      kind: null,
      setupStep: 0,
      winner: null,
      remainingSeconds: null,
      lastCorrect: null,
      ...IDLE_FIGHT,
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
    const { settings, teamA, teamB, kind } = get();
    const hp = kind === "fight" ? FIGHT_MAX_HP : 0;
    set({
      screen: "play",
      winner: null,
      lastCorrect: null,
      lastCorrectAt: 0,
      remainingSeconds: settings.timerEnabled ? settings.timerSeconds : null,
      teamA: freshTeam(teamA.name.trim() || "Команда 1", teamA.color, settings, hp),
      teamB: freshTeam(teamB.name.trim() || "Команда 2", teamB.color, settings, hp),
      ...IDLE_FIGHT,
    });
  },

  replay: () => get().startMatch(),

  typeDigit: (id, digit) => {
    const s = get();
    if (s.winner || fightLocked(s, id)) return;
    const team = id === "a" ? s.teamA : s.teamB;
    if (team.input.length >= 6) return;
    set(patchTeam(s, id, { input: team.input + digit, flash: null }));
  },

  backspace: (id) => {
    const s = get();
    if (s.winner || fightLocked(s, id)) return;
    const team = id === "a" ? s.teamA : s.teamB;
    set(patchTeam(s, id, { input: team.input.slice(0, -1), flash: null }));
  },

  submit: (id) => {
    const s = get();
    if (s.winner) return;
    if (s.kind === "fight") {
      submitFight(set, get, id);
      return;
    }
    const team = id === "a" ? s.teamA : s.teamB;
    const value = Number.parseInt(team.input, 10);
    if (team.input === "" || Number.isNaN(value)) {
      set(patchTeam(s, id, { flash: "bad" }));
      return;
    }
    if (value !== team.problem.answer) {
      set(patchTeam(s, id, { input: "", flash: "bad" }));
      return;
    }
    const score = team.score + 1;
    const won = score >= s.settings.winScore;
    set({
      ...patchTeam(s, id, {
        score,
        input: "",
        flash: "ok",
        problem: generateProblem(s.settings.ops, s.settings.digits),
      }),
      lastCorrect: id,
      lastCorrectAt: Date.now(),
      winner: won ? id : null,
    });
  },

  clearFlash: (id) => set((s) => patchTeam(s, id, { flash: null })),

  tickTimer: () => {
    const { remainingSeconds, winner, teamA, teamB, kind } = get();
    if (winner || remainingSeconds === null) return;
    const next = remainingSeconds - 1;
    if (next <= 0) {
      const aVal = kind === "fight" ? teamA.hp : teamA.score;
      const bVal = kind === "fight" ? teamB.hp : teamB.score;
      const result: Winner = aVal > bVal ? "a" : bVal > aVal ? "b" : "draw";
      set({ remainingSeconds: 0, winner: result });
      return;
    }
    set({ remainingSeconds: next });
  },

  tickFight: () => {
    const s = get();
    if (s.kind !== "fight" || s.winner) return;
    if (s.fightPhase !== "windup" && s.fightPhase !== "miss") return;
    if (Date.now() < s.fightUntil) return;
    const now = Date.now();
    if (s.fightPhase === "windup" && s.fightActor) {
      const hit = applyDamage(s, other(s.fightActor), FIGHT_DMG.hit);
      set({
        ...hit,
        fightPhase: "idle",
        fightActor: null,
        fightUntil: 0,
        lastHit: { kind: "hit", from: s.fightActor, to: other(s.fightActor), at: now },
      });
      return;
    }
    if (s.fightPhase === "miss" && s.fightActor) {
      set({
        fightPhase: "idle",
        fightActor: null,
        fightUntil: 0,
        lastHit: { kind: "recover", from: s.fightActor, to: other(s.fightActor), at: now },
      });
    }
  },
}));

function submitFight(
  set: (partial: Partial<GamesState>) => void,
  get: () => GamesState,
  id: TeamId,
) {
  const s = get();
  if (fightLocked(s, id)) return;
  const now = Date.now();
  const team = id === "a" ? s.teamA : s.teamB;
  const value = Number.parseInt(team.input, 10);
  const empty = team.input === "" || Number.isNaN(value);
  const correct = !empty && value === team.problem.answer;
  const nextProblem = () => generateProblem(s.settings.ops, s.settings.digits);

  if (s.fightPhase === "idle") {
    if (empty) {
      set(patchTeam(s, id, { flash: "bad" }));
      return;
    }
    if (!correct) {
      set({
        ...patchTeam(s, id, { input: "", flash: "bad" }),
        fightPhase: "miss",
        fightActor: id,
        fightUntil: now + FIGHT_WINDOW_MS,
        lastHit: null,
      });
      return;
    }
    set({
      ...patchTeam(s, id, { input: "", flash: "ok", problem: nextProblem() }),
      fightPhase: "windup",
      fightActor: id,
      fightUntil: now + FIGHT_WINDOW_MS,
      lastCorrect: id,
      lastCorrectAt: now,
    });
    return;
  }

  if (s.fightPhase === "windup" && s.fightActor) {
    const target = other(s.fightActor);
    if (empty) {
      set(patchTeam(s, id, { flash: "bad" }));
      return;
    }
    if (correct) {
      const hit = applyDamage(s, target, FIGHT_DMG.block);
      set({
        ...hit,
        ...withTeam(hit, id, { input: "", flash: "ok", problem: nextProblem() }),
        fightPhase: "idle",
        fightActor: null,
        fightUntil: 0,
        lastHit: { kind: "block", from: s.fightActor, to: target, at: now },
        lastCorrect: id,
        lastCorrectAt: now,
      });
      return;
    }
    const hit = applyDamage(s, target, FIGHT_DMG.punish);
    set({
      ...hit,
      ...withTeam(hit, id, { input: "", flash: "bad" }),
      fightPhase: "idle",
      fightActor: null,
      fightUntil: 0,
      lastHit: { kind: "punish", from: s.fightActor, to: target, at: now },
    });
    return;
  }

  if (s.fightPhase === "miss" && s.fightActor) {
    if (empty) {
      set(patchTeam(s, id, { flash: "bad" }));
      return;
    }
    if (correct) {
      const hit = applyDamage(s, s.fightActor, FIGHT_DMG.counter);
      set({
        ...hit,
        ...withTeam(hit, id, { input: "", flash: "ok", problem: nextProblem() }),
        fightPhase: "idle",
        fightActor: null,
        fightUntil: 0,
        lastHit: { kind: "counter", from: id, to: s.fightActor, at: now },
        lastCorrect: id,
        lastCorrectAt: now,
      });
      return;
    }
    set({
      ...patchTeam(s, id, { input: "", flash: "bad" }),
      fightPhase: "grapple",
      fightActor: null,
      fightUntil: 0,
      lastHit: { kind: "grapple", from: id, to: s.fightActor, at: now },
    });
    return;
  }

  if (s.fightPhase === "grapple") {
    if (empty || !correct) {
      set(patchTeam(s, id, { input: empty ? team.input : "", flash: "bad" }));
      return;
    }
    const hit = applyDamage(s, other(id), FIGHT_DMG.grapple);
    set({
      ...hit,
      ...withTeam(hit, id, { input: "", flash: "ok", problem: nextProblem() }),
      lastHit: { kind: "grapple", from: id, to: other(id), at: now },
      lastCorrect: id,
      lastCorrectAt: now,
    });
  }
}
