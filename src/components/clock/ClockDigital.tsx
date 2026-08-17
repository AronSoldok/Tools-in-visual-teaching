"use client";

import { useEffect, useState } from "react";
import { formatDigital, parseDigital } from "@/lib/clockTime";
import { useClockStore } from "@/store/clockStore";

export function ClockDigital() {
  const hours = useClockStore((s) => s.hours);
  const minutes = useClockStore((s) => s.minutes);
  const format = useClockStore((s) => s.format);
  const digitalVisible = useClockStore((s) => s.digitalVisible);
  const target = useClockStore((s) => s.target);
  const setTime = useClockStore((s) => s.setTime);

  const [draft, setDraft] = useState(formatDigital(hours, minutes, format));
  const hideLive = !digitalVisible || target !== null;

  useEffect(() => {
    if (!hideLive) setDraft(formatDigital(hours, minutes, format));
  }, [hours, minutes, format, hideLive]);

  const commit = () => {
    const parsed = parseDigital(draft, format, hours);
    if (parsed) setTime(parsed.hours, parsed.minutes);
    else setDraft(formatDigital(hours, minutes, format));
  };

  if (target) {
    return (
      <p className="clock-target" aria-live="polite">
        Выставь {formatDigital(target.hours, target.minutes, format)}
      </p>
    );
  }

  if (hideLive) return <div className="clock-digital-placeholder" />;

  return (
    <input
      className="clock-digital-input"
      value={draft}
      inputMode="numeric"
      aria-label="Цифровое время"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
    />
  );
}
