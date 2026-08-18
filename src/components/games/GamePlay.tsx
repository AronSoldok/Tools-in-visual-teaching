"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { TeamPanel } from "./TeamPanel";
import { useGamesStore } from "@/store/gamesStore";

const TugArena = dynamic(() => import("./TugArena").then((m) => m.TugArena), {
  ssr: false,
  loading: () => <div className="games-arena-stage" />,
});
const RaceArena = dynamic(() => import("./RaceArena").then((m) => m.RaceArena), {
  ssr: false,
  loading: () => <div className="games-arena-stage" />,
});
const BattleArena = dynamic(() => import("./BattleArena").then((m) => m.BattleArena), {
  ssr: false,
  loading: () => <div className="games-arena-stage" />,
});
const FightArena = dynamic(() => import("./FightArena").then((m) => m.FightArena), {
  ssr: false,
  loading: () => <div className="games-arena-stage" />,
});

function formatTime(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function GamePlay() {
  const kind = useGamesStore((s) => s.kind);
  const teamA = useGamesStore((s) => s.teamA);
  const teamB = useGamesStore((s) => s.teamB);
  const settings = useGamesStore((s) => s.settings);
  const remainingSeconds = useGamesStore((s) => s.remainingSeconds);
  const winner = useGamesStore((s) => s.winner);
  const lastCorrect = useGamesStore((s) => s.lastCorrect);
  const lastCorrectAt = useGamesStore((s) => s.lastCorrectAt);
  const fightPhase = useGamesStore((s) => s.fightPhase);
  const fightActor = useGamesStore((s) => s.fightActor);
  const fightUntil = useGamesStore((s) => s.fightUntil);
  const lastHit = useGamesStore((s) => s.lastHit);
  const backToPick = useGamesStore((s) => s.backToPick);
  const tickTimer = useGamesStore((s) => s.tickTimer);
  const tickFight = useGamesStore((s) => s.tickFight);

  const timerOn = remainingSeconds !== null && !winner;
  const fightWindowOn =
    kind === "fight" && !winner && (fightPhase === "windup" || fightPhase === "miss");

  useEffect(() => {
    if (!timerOn) return;
    const id = window.setInterval(() => tickTimer(), 1000);
    return () => window.clearInterval(id);
  }, [timerOn, tickTimer]);

  useEffect(() => {
    if (!fightWindowOn) return;
    const id = window.setInterval(() => tickFight(), 100);
    return () => window.clearInterval(id);
  }, [fightWindowOn, tickFight]);

  return (
    <div className="games-play">
      <header className="games-play-bar">
        <button type="button" className="action-btn" onClick={backToPick}>
          К играм
        </button>
        <div className="games-scoreboard">
          <span className="games-score-pill" style={{ borderColor: teamA.color, color: teamA.color }}>
            {teamA.name}: {kind === "fight" ? teamA.hp : teamA.score}
          </span>
          <span className="games-score-goal">{kind === "fight" ? "HP" : `до ${settings.winScore}`}</span>
          <span className="games-score-pill" style={{ borderColor: teamB.color, color: teamB.color }}>
            {teamB.name}: {kind === "fight" ? teamB.hp : teamB.score}
          </span>
        </div>
        {remainingSeconds !== null ? (
          <div className={`games-timer ${remainingSeconds <= 10 ? "urgent" : ""}`}>
            {formatTime(remainingSeconds)}
          </div>
        ) : (
          <div className="games-timer muted">Без таймера</div>
        )}
      </header>

      <div className="games-arena-wrap">
        {kind === "tug" && (
          <TugArena
            colorA={teamA.color}
            colorB={teamB.color}
            scoreA={teamA.score}
            scoreB={teamB.score}
            winScore={settings.winScore}
            lastCorrect={lastCorrect}
            lastCorrectAt={lastCorrectAt}
          />
        )}
        {kind === "race" && (
          <RaceArena
            colorA={teamA.color}
            colorB={teamB.color}
            nameA={teamA.name}
            nameB={teamB.name}
            scoreA={teamA.score}
            scoreB={teamB.score}
            winScore={settings.winScore}
            lastCorrect={lastCorrect}
            lastCorrectAt={lastCorrectAt}
          />
        )}
        {kind === "battle" && (
          <BattleArena
            colorA={teamA.color}
            colorB={teamB.color}
            scoreA={teamA.score}
            scoreB={teamB.score}
            winScore={settings.winScore}
            lastCorrect={lastCorrect}
            lastCorrectAt={lastCorrectAt}
          />
        )}
        {kind === "fight" && (
          <FightArena
            colorA={teamA.color}
            colorB={teamB.color}
            hpA={teamA.hp}
            hpB={teamB.hp}
            phase={fightPhase}
            actor={fightActor}
            until={fightUntil}
            lastHit={lastHit}
          />
        )}
      </div>

      <div className="games-teams">
        <TeamPanel id="a" />
        <TeamPanel id="b" />
      </div>
    </div>
  );
}
