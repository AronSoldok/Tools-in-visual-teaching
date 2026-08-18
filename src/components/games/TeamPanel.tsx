"use client";

import { useEffect } from "react";
import { useGamesStore, type TeamId } from "@/store/gamesStore";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function TeamPanel({ id }: { id: TeamId }) {
  const team = useGamesStore((s) => (id === "a" ? s.teamA : s.teamB));
  const typeDigit = useGamesStore((s) => s.typeDigit);
  const backspace = useGamesStore((s) => s.backspace);
  const submit = useGamesStore((s) => s.submit);
  const clearFlash = useGamesStore((s) => s.clearFlash);
  const winner = useGamesStore((s) => s.winner);

  useEffect(() => {
    if (!team.flash) return;
    const t = window.setTimeout(() => clearFlash(id), 450);
    return () => window.clearTimeout(t);
  }, [team.flash, clearFlash, id]);

  return (
    <section
      className={`team-panel ${team.flash ? `flash-${team.flash}` : ""}`}
      style={{ borderColor: team.color }}
    >
      <header className="team-panel-head" style={{ background: team.color }}>
        <h2 className="team-panel-name">{team.name}</h2>
        <span className="team-panel-score">{team.score}</span>
      </header>
      <p className="team-problem">{team.problem.text} =</p>
      <div className={`team-input ${team.flash === "bad" ? "bad" : ""} ${team.flash === "ok" ? "ok" : ""}`}>
        {team.input || "?"}
      </div>
      <div className="team-keypad">
        {KEYS.map((d) => (
          <button key={d} type="button" className="team-key" disabled={!!winner} onClick={() => typeDigit(id, d)}>
            {d}
          </button>
        ))}
        <button type="button" className="team-key" disabled={!!winner} onClick={() => backspace(id)}>
          ⌫
        </button>
        <button type="button" className="team-key" disabled={!!winner} onClick={() => typeDigit(id, "0")}>
          0
        </button>
        <button type="button" className="team-key team-key-ok" disabled={!!winner} onClick={() => submit(id)}>
          ОК
        </button>
      </div>
    </section>
  );
}
