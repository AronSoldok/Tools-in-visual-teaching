"use client";

import { useEffect } from "react";
import { AnalogClock } from "./AnalogClock";
import { ClockControls } from "./ClockControls";
import { ClockDigital } from "./ClockDigital";
import { ClockHourPad, ClockMinutePad } from "./ClockPads";
import { hydrateClockFactsPref, useClockStore } from "@/store/clockStore";

export function ClockApp() {
  const target = useClockStore((s) => s.target);
  const feedback = useClockStore((s) => s.feedback);

  useEffect(() => {
    hydrateClockFactsPref();
  }, []);

  return (
    <div className="clock-app">
      <div className="clock-stage">
        {!target && <ClockHourPad />}
        <div className="clock-stage-center">
          <ClockDigital />
          <AnalogClock />
          {feedback && !feedback.correct && (
            <div className="clock-result-card bad">
              <p className="clock-result-title">Неверно</p>
              <p className="clock-result-retry">Попробуй ещё.</p>
              {feedback.fact && <p className="clock-fact">{feedback.fact}</p>}
            </div>
          )}
        </div>
        {!target && <ClockMinutePad />}
      </div>
      <ClockControls />
    </div>
  );
}
