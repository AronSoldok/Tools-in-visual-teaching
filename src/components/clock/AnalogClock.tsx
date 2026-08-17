"use client";

import { useEffect, useRef } from "react";
import { hourAngle, minuteAngle, pointerAngleDeg, minutesFromAngle, analogHour } from "@/lib/clockTime";
import { useClockStore } from "@/store/clockStore";

const SIZE = 400;
const CX = 200;
const CY = 200;

export function AnalogClock() {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<"hour" | "minute" | null>(null);
  const hours = useClockStore((s) => s.hours);
  const minutes = useClockStore((s) => s.minutes);
  const hourLocked = useClockStore((s) => s.hourLocked);
  const minuteLocked = useClockStore((s) => s.minuteLocked);

  const hAngle = hourAngle(hours, minutes);
  const mAngle = minuteAngle(minutes);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const hand = dragRef.current;
      const svg = svgRef.current;
      if (!hand || !svg) return;
      const rect = svg.getBoundingClientRect();
      const deg = pointerAngleDeg(e.clientX, e.clientY, rect);
      const state = useClockStore.getState();

      if (hand === "minute") {
        if (state.minuteLocked) return;
        state.setMinutes(minutesFromAngle(deg));
        return;
      }

      if (state.hourLocked) return;
      const analogMinutes = Math.round(deg / 0.5) % (12 * 60);
      const analogH = Math.floor(analogMinutes / 60) % 12;
      const nextHours = state.hours >= 12 ? analogH + 12 : analogH;
      if (state.minuteLocked) {
        state.setHours(nextHours);
      } else {
        state.setTime(nextHours, analogMinutes % 60);
      }
    };

    const onUp = () => {
      dragRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      className="analog-clock"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={`Циферблат: ${analogHour(hours) || 12} часов ${minutes} минут`}
    >
      <circle cx={CX} cy={CY} r={188} className="analog-clock-ring" />
      <circle cx={CX} cy={CY} r={168} className="analog-clock-face" />
      {Array.from({ length: 60 }).map((_, i) => {
        const a = (i * 6 * Math.PI) / 180;
        const r = i % 5 === 0 ? 5 : 2.2;
        const dist = i % 5 === 0 ? 158 : 160;
        const x = CX + Math.sin(a) * dist;
        const y = CY - Math.cos(a) * dist;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={r}
            className={i % 5 === 0 ? "analog-clock-hour-dot" : "analog-clock-minute-dot"}
          />
        );
      })}
      {Array.from({ length: 12 }).map((_, i) => {
        const n = i + 1;
        const a = (n * 30 * Math.PI) / 180;
        const x = CX + Math.sin(a) * 128;
        const y = CY - Math.cos(a) * 128;
        return (
          <text key={n} x={x} y={y} className="analog-clock-number" textAnchor="middle" dominantBaseline="middle">
            {n}
          </text>
        );
      })}
      <g
        className={`analog-hand analog-hand-hour ${hourLocked ? "locked" : ""}`}
        transform={`rotate(${hAngle} ${CX} ${CY})`}
        onPointerDown={(e) => {
          if (hourLocked) return;
          e.preventDefault();
          e.stopPropagation();
          dragRef.current = "hour";
          (e.target as Element).setPointerCapture?.(e.pointerId);
        }}
      >
        <rect x={CX - 14} y={CY - 110} width={28} height={130} rx={10} fill="transparent" />
        <rect className="analog-hand-shape" x={CX - 8} y={CY - 105} width={16} height={120} rx={8} />
      </g>
      <g
        className={`analog-hand analog-hand-minute ${minuteLocked ? "locked" : ""}`}
        transform={`rotate(${mAngle} ${CX} ${CY})`}
        onPointerDown={(e) => {
          if (minuteLocked) return;
          e.preventDefault();
          e.stopPropagation();
          dragRef.current = "minute";
          (e.target as Element).setPointerCapture?.(e.pointerId);
        }}
      >
        <rect x={CX - 12} y={CY - 155} width={24} height={180} rx={8} fill="transparent" />
        <rect className="analog-hand-shape" x={CX - 5} y={CY - 148} width={10} height={168} rx={5} />
      </g>
      <circle cx={CX} cy={CY} r={12} className="analog-clock-cap" />
    </svg>
  );
}
