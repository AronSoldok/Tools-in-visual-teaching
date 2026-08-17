"use client";

import { useEffect } from "react";
import { AnalogClock } from "./AnalogClock";
import { ClockControls } from "./ClockControls";
import { ClockDigital } from "./ClockDigital";
import { ClockHourPad, ClockMinutePad } from "./ClockPads";
import { hydrateClockFactsPref } from "@/store/clockStore";

export function ClockApp() {
  useEffect(() => {
    hydrateClockFactsPref();
  }, []);

  return (
    <div className="clock-app">
      <div className="clock-stage">
        <ClockHourPad />
        <div className="clock-stage-center">
          <ClockDigital />
          <AnalogClock />
        </div>
        <ClockMinutePad />
      </div>
      <ClockControls />
    </div>
  );
}
