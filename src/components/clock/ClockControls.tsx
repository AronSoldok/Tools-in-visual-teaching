"use client";

import { useClockStore } from "@/store/clockStore";

export function ClockControls() {
  const format = useClockStore((s) => s.format);
  const hourLocked = useClockStore((s) => s.hourLocked);
  const minuteLocked = useClockStore((s) => s.minuteLocked);
  const digitalVisible = useClockStore((s) => s.digitalVisible);
  const target = useClockStore((s) => s.target);
  const factsEnabled = useClockStore((s) => s.factsEnabled);
  const setFormat = useClockStore((s) => s.setFormat);
  const toggleHourLock = useClockStore((s) => s.toggleHourLock);
  const toggleMinuteLock = useClockStore((s) => s.toggleMinuteLock);
  const toggleDigital = useClockStore((s) => s.toggleDigital);
  const spawnTarget = useClockStore((s) => s.spawnTarget);
  const clearTarget = useClockStore((s) => s.clearTarget);
  const confirmTarget = useClockStore((s) => s.confirmTarget);
  const toggleFacts = useClockStore((s) => s.toggleFacts);

  return (
    <div className="clock-controls">
      <div className="clock-format-toggle" role="group" aria-label="Формат времени">
        <button
          type="button"
          className={`action-btn ${format === "12" ? "active" : ""}`}
          onClick={() => setFormat("12")}
        >
          12 ч
        </button>
        <button
          type="button"
          className={`action-btn ${format === "24" ? "active" : ""}`}
          onClick={() => setFormat("24")}
        >
          24 ч
        </button>
      </div>

      <label className="clock-lock">
        <input type="checkbox" checked={hourLocked} onChange={toggleHourLock} />
        <span>Часовая стрелка</span>
      </label>
      <label className="clock-lock">
        <input type="checkbox" checked={minuteLocked} onChange={toggleMinuteLock} />
        <span>Минутная стрелка</span>
      </label>

      <button type="button" className="action-btn action-btn-confirm" onClick={spawnTarget}>
        Случайное время
      </button>
      {target && (
        <>
          <button type="button" className="action-btn action-btn-confirm" onClick={confirmTarget}>
            Подтвердить
          </button>
          <button type="button" className="action-btn" onClick={clearTarget}>
            Отменить
          </button>
        </>
      )}
      <button type="button" className="action-btn" onClick={toggleDigital}>
        {digitalVisible ? "Скрыть цифровое время" : "Показать цифровое время"}
      </button>

      <button type="button" className="clock-facts-toggle" onClick={toggleFacts}>
        {factsEnabled ? "Факты выкл." : "Факты вкл."}
      </button>
    </div>
  );
}
