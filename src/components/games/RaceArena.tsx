"use client";

import type { TeamId } from "@/store/gamesStore";

type Props = {
  colorA: string;
  colorB: string;
  nameA: string;
  nameB: string;
  scoreA: number;
  scoreB: number;
  winScore: number;
  lastCorrect: TeamId | null;
  lastCorrectAt: number;
};

function Car({ color, dash, burst }: { color: string; dash: boolean; burst: number }) {
  return (
    <g className={`race-car ${dash ? "dash" : ""}`}>
      {dash && (
        <g className="race-dust" aria-hidden key={burst}>
          <circle className="dust d1" cx="-18" cy="18" r="4" />
          <circle className="dust d2" cx="-28" cy="16" r="3" />
          <circle className="dust d3" cx="-10" cy="20" r="2.5" />
        </g>
      )}
      <rect className="race-body" x="0" y="4" width="56" height="20" rx="8" fill={color} />
      <path d="M14 4 L22 -8 H42 L50 4 Z" fill={color} opacity="0.85" />
      <rect x="24" y="-6" width="16" height="8" rx="2" fill="#e0f2fe" />
      <circle className="race-wheel" cx="14" cy="24" r="7" />
      <circle className="race-wheel" cx="44" cy="24" r="7" />
      <circle cx="14" cy="24" r="3" fill="#e2e8f0" />
      <circle cx="44" cy="24" r="3" fill="#e2e8f0" />
    </g>
  );
}

export function RaceArena({
  colorA,
  colorB,
  nameA,
  nameB,
  scoreA,
  scoreB,
  winScore,
  lastCorrect,
  lastCorrectAt,
}: Props) {
  const xA = 36 + (scoreA / Math.max(1, winScore)) * 620;
  const xB = 36 + (scoreB / Math.max(1, winScore)) * 620;

  return (
    <svg className="games-arena-svg race-arena" viewBox="0 0 800 230" role="img" aria-label="Гонки">
      <rect width="800" height="230" fill="#86efac" />
      <rect x="20" y="28" width="760" height="78" rx="14" fill="#64748b" />
      <rect x="20" y="124" width="760" height="78" rx="14" fill="#475569" />
      <line className="race-dash-line" x1="40" y1="67" x2="760" y2="67" />
      <line className="race-dash-line" x1="40" y1="163" x2="760" y2="163" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="748" y={28 + i * 19.5} width="18" height="10" fill={i % 2 ? "#0f172a" : "#f8fafc"} />
          <rect x="748" y={124 + i * 19.5} width="18" height="10" fill={i % 2 ? "#0f172a" : "#f8fafc"} />
        </g>
      ))}
      <text x="36" y="22" className="race-label" fill={colorA}>
        {nameA}
      </text>
      <text x="36" y="118" className="race-label" fill={colorB}>
        {nameB}
      </text>
      <g className="race-car-slot" style={{ transform: `translate(${xA}px, 48px)` }}>
        <Car color={colorA} dash={lastCorrect === "a"} burst={lastCorrectAt} />
      </g>
      <g className="race-car-slot" style={{ transform: `translate(${xB}px, 144px)` }}>
        <Car color={colorB} dash={lastCorrect === "b"} burst={lastCorrectAt} />
      </g>
    </svg>
  );
}
