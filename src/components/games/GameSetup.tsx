"use client";

import { ALL_OPS, OP_LABELS, type DigitCount } from "@/lib/mathProblems";
import { TEAM_COLORS, useGamesStore } from "@/store/gamesStore";

const WIN_PRESETS = [5, 7, 10, 15];
const TIMER_PRESETS = [
  { label: "Выкл.", seconds: 0 },
  { label: "1:00", seconds: 60 },
  { label: "2:00", seconds: 120 },
  { label: "3:00", seconds: 180 },
  { label: "5:00", seconds: 300 },
];

const STEP_TITLES = ["Действия", "Сложность", "Команды"];
const KIND_TITLES = {
  tug: "Перетягивание каната",
  race: "Гонки",
  battle: "Морской бой",
};

function formatTime(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function GameSetup() {
  const kind = useGamesStore((s) => s.kind);
  const step = useGamesStore((s) => s.setupStep);
  const settings = useGamesStore((s) => s.settings);
  const teamA = useGamesStore((s) => s.teamA);
  const teamB = useGamesStore((s) => s.teamB);
  const setSetupStep = useGamesStore((s) => s.setSetupStep);
  const backToPick = useGamesStore((s) => s.backToPick);
  const toggleOp = useGamesStore((s) => s.toggleOp);
  const setDigits = useGamesStore((s) => s.setDigits);
  const setWinScore = useGamesStore((s) => s.setWinScore);
  const setTimerEnabled = useGamesStore((s) => s.setTimerEnabled);
  const setTimerSeconds = useGamesStore((s) => s.setTimerSeconds);
  const setTeamName = useGamesStore((s) => s.setTeamName);
  const setTeamColor = useGamesStore((s) => s.setTeamColor);
  const startMatch = useGamesStore((s) => s.startMatch);

  const minutes = Math.floor(settings.timerSeconds / 60);
  const seconds = settings.timerSeconds % 60;
  const customWin = !WIN_PRESETS.includes(settings.winScore);

  return (
    <div className="games-setup">
      <header className="games-header">
        <button type="button" className="action-btn" onClick={step === 0 ? backToPick : () => setSetupStep(step - 1)}>
          Назад
        </button>
        <div>
          <p className="games-kicker">{kind ? KIND_TITLES[kind] : "Игра"}</p>
          <h1 className="games-title">{STEP_TITLES[step]}</h1>
        </div>
        <div className="games-setup-steps" aria-hidden>
          {STEP_TITLES.map((label, i) => (
            <span key={label} className={`games-step-dot ${i === step ? "active" : i < step ? "done" : ""}`} />
          ))}
        </div>
      </header>

      <div className="games-setup-body">
        {step === 0 && (
          <section className="games-card">
            <p className="games-card-label">Какие действия будут в примерах</p>
            <div className="games-chip-row">
              {ALL_OPS.map((op) => (
                <button
                  key={op}
                  type="button"
                  className={`mode-btn ${settings.ops.includes(op) ? "active" : ""}`}
                  onClick={() => toggleOp(op)}
                >
                  <span className="games-op-sign">{op}</span>
                  {OP_LABELS[op]}
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 1 && (
          <>
            <section className="games-card">
              <p className="games-card-label">Значность примеров</p>
              <div className="games-chip-row">
                {([1, 2, 3] as DigitCount[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`mode-btn ${settings.digits === d ? "active" : ""}`}
                    onClick={() => setDigits(d)}
                  >
                    {d}-значные
                  </button>
                ))}
              </div>
            </section>
            <section className="games-card">
              <p className="games-card-label">Сколько верных ответов до победы</p>
              <div className="games-chip-row">
                {WIN_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`mode-btn ${settings.winScore === n ? "active" : ""}`}
                    onClick={() => setWinScore(n)}
                  >
                    {n}
                  </button>
                ))}
                <label className="games-inline-field">
                  Своё
                  <input
                    type="number"
                    min={1}
                    max={99}
                    className="games-num-input"
                    value={customWin ? settings.winScore : ""}
                    placeholder="…"
                    onChange={(e) => {
                      if (e.target.value === "") return;
                      const n = Number(e.target.value);
                      if (Number.isFinite(n)) setWinScore(n);
                    }}
                  />
                </label>
              </div>
            </section>
            <section className="games-card">
              <p className="games-card-label">Общий таймер матча</p>
              <div className="games-chip-row">
                {TIMER_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    className={`mode-btn ${
                      p.seconds === 0
                        ? !settings.timerEnabled
                          ? "active"
                          : ""
                        : settings.timerEnabled && settings.timerSeconds === p.seconds
                          ? "active"
                          : ""
                    }`}
                    onClick={() => {
                      if (p.seconds === 0) setTimerEnabled(false);
                      else {
                        setTimerEnabled(true);
                        setTimerSeconds(p.seconds);
                      }
                    }}
                  >
                    {p.label}
                  </button>
                ))}
                <label className="games-inline-field">
                  Своё
                  <input
                    type="number"
                    min={0}
                    max={99}
                    className="games-num-input"
                    aria-label="Минуты"
                    value={settings.timerEnabled ? minutes : ""}
                    placeholder="м"
                    onChange={(e) => {
                      const m = Math.max(0, Number(e.target.value) || 0);
                      setTimerEnabled(true);
                      setTimerSeconds(m * 60 + seconds);
                    }}
                  />
                  :
                  <input
                    type="number"
                    min={0}
                    max={59}
                    className="games-num-input"
                    aria-label="Секунды"
                    value={settings.timerEnabled ? seconds : ""}
                    placeholder="с"
                    onChange={(e) => {
                      const sec = Math.min(59, Math.max(0, Number(e.target.value) || 0));
                      setTimerEnabled(true);
                      setTimerSeconds(minutes * 60 + sec);
                    }}
                  />
                </label>
              </div>
              {settings.timerEnabled && (
                <p className="games-card-note">Матч: {formatTime(settings.timerSeconds)}</p>
              )}
            </section>
          </>
        )}

        {step === 2 && (
          <div className="games-teams-setup">
            {(["a", "b"] as const).map((id) => {
              const team = id === "a" ? teamA : teamB;
              return (
                <section key={id} className="games-card" style={{ borderColor: team.color }}>
                  <p className="games-card-label">{id === "a" ? "Первая команда" : "Вторая команда"}</p>
                  <input
                    className="games-text-input"
                    value={team.name}
                    maxLength={24}
                    onChange={(e) => setTeamName(id, e.target.value)}
                    aria-label={id === "a" ? "Имя первой команды" : "Имя второй команды"}
                  />
                  <div className="color-picker-swatches">
                    {TEAM_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`color-swatch ${team.color === c.value ? "active" : ""}`}
                        style={{ backgroundColor: c.value }}
                        onClick={() => setTeamColor(id, c.value)}
                        title={c.label}
                        aria-label={c.label}
                        aria-pressed={team.color === c.value}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <footer className="games-setup-footer">
        {step < 2 ? (
          <button type="button" className="action-btn action-btn-confirm" onClick={() => setSetupStep(step + 1)}>
            Далее
          </button>
        ) : (
          <button type="button" className="action-btn action-btn-confirm" onClick={startMatch}>
            Начать игру
          </button>
        )}
      </footer>
    </div>
  );
}
