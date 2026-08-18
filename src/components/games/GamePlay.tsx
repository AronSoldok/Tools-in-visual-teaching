"use client";

import { useEffect } from "react";
import { BattleArena } from "./BattleArena";
import { RaceArena } from "./RaceArena";
import { TeamPanel } from "./TeamPanel";
import { TugArena } from "./TugArena";
import { useGamesStore } from "@/store/gamesStore";

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
  const backToPick = useGamesStore((s) => s.backToPick);
  const tickTimer = useGamesStore((s) => s.tickTimer);

  const timerOn = remainingSeconds !== null && !winner;

  useEffect(() => {
    if (!timerOn) return;
    const id = window.setInterval(() => tickTimer(), 1000);
    return () => window.clearInterval(id);
  }, [timerOn, tickTimer]);

  return (
    <div className="games-play">
      <header className="games-play-bar">
        <button type="button" className="action-btn" onClick={backToPick}>
          К играм
        </button>
        <div className="games-scoreboard">
          <span className="games-score-pill" style={{ borderColor: teamA.color, color: teamA.color }}>
            {teamA.name}: {teamA.score}
          </span>
          <span className="games-score-goal">до {settings.winScore}</span>
          <span className="games-score-pill" style={{ borderColor: teamB.color, color: teamB.color }}>
            {teamB.name}: {teamB.score}
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
      </div>

      <div className="games-teams">
        <TeamPanel id="a" />
        <TeamPanel id="b" />
      </div>
    </div>
  );
}
