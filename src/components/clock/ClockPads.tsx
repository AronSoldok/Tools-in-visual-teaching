"use client";

import { displayHour, hourLabel, minuteLabel } from "@/lib/clockTime";
import { useClockStore } from "@/store/clockStore";

const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

export function ClockHourPad() {
  const hours = useClockStore((s) => s.hours);
  const format = useClockStore((s) => s.format);
  const hourLocked = useClockStore((s) => s.hourLocked);
  const setHourFromPad = useClockStore((s) => s.setHourFromPad);

  const hourButtons =
    format === "12"
      ? [Array.from({ length: 12 }, (_, i) => i + 1)]
      : [Array.from({ length: 12 }, (_, i) => i + 1), [...Array.from({ length: 11 }, (_, i) => i + 13), 0]];

  const activeHour = format === "12" ? displayHour(hours, "12") : hours;

  return (
    <div className="clock-pad clock-pad-hours" aria-label="Часы">
      {hourButtons.map((col, colIndex) => (
        <div key={colIndex} className="clock-pad-col">
          {col.map((h) => (
            <button
              key={h}
              type="button"
              className={`clock-pad-btn ${activeHour === h ? "active" : ""}`}
              disabled={hourLocked}
              onClick={() => setHourFromPad(h)}
            >
              {hourLabel(h)}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ClockMinutePad() {
  const minutes = useClockStore((s) => s.minutes);
  const minuteLocked = useClockStore((s) => s.minuteLocked);
  const setMinutes = useClockStore((s) => s.setMinutes);

  return (
    <div className="clock-pad clock-pad-minutes" aria-label="Минуты">
      <div className="clock-pad-col">
        {MINUTES.map((m) => {
          const value = m === 60 ? 0 : m;
          const isActive = m !== 60 && minutes === value;
          return (
            <button
              key={m}
              type="button"
              className={`clock-pad-btn ${isActive ? "active" : ""}`}
              disabled={minuteLocked}
              onClick={() => setMinutes(value)}
            >
              {minuteLabel(m)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
