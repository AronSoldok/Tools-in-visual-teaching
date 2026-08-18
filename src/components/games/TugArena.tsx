"use client";

import type { TeamId } from "@/store/gamesStore";

type ArenaProps = {
  colorA: string;
  colorB: string;
  scoreA: number;
  scoreB: number;
  winScore: number;
  lastCorrect: TeamId | null;
  lastCorrectAt: number;
};

function Person({
  x,
  y,
  color,
  facing,
  delay,
}: {
  x: number;
  y: number;
  color: string;
  facing: 1 | -1;
  delay: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${facing} 1)`}>
      <ellipse className="tug-shadow" cx="0" cy="58" rx="16" ry="5" />
      <g className="tug-body" style={{ animationDelay: delay }}>
        <line className="tug-leg back" x1="0" y1="18" x2="-10" y2="54" stroke="#3d2c1e" />
        <line className="tug-leg front" x1="0" y1="18" x2="8" y2="54" stroke="#3d2c1e" />
        <line className="tug-torso" x1="0" y1="18" x2="4" y2="-8" stroke={color} />
        <line className="tug-arm" x1="2" y1="0" x2="28" y2="-6" stroke={color} />
        <circle cx="6" cy="-16" r="8" fill={color} />
      </g>
    </g>
  );
}

export function TugArena({ colorA, colorB, scoreA, scoreB, winScore, lastCorrect, lastCorrectAt }: ArenaProps) {
  const lead = Math.max(-1, Math.min(1, (scoreA - scoreB) / Math.max(1, winScore)));
  const shift = lead * 90;

  return (
    <svg className="games-arena-svg tug-arena" viewBox="0 0 800 220" role="img" aria-label="Перетягивание каната">
      <defs>
        <linearGradient id="tug-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="55%" stopColor="#fde8d8" />
          <stop offset="100%" stopColor="#bbf7d0" />
        </linearGradient>
      </defs>
      <rect width="800" height="220" fill="url(#tug-sky)" />
      <ellipse cx="400" cy="198" rx="380" ry="28" fill="#86efac" />
      <rect x="388" y="40" width="8" height="130" rx="3" fill="#92400e" />
      <polygon points="396,40 396,78 448,59" fill="#f97316" />

      <g className="tug-field" style={{ transform: `translateX(${shift}px)` }}>
        <g className={lastCorrect ? `tug-yank tug-yank-${lastCorrect}` : ""} key={lastCorrectAt}>
          <Person x={118} y={92} color={colorA} facing={1} delay="0s" />
          <Person x={168} y={96} color={colorA} facing={1} delay="0.12s" />
          <Person x={218} y={90} color={colorA} facing={1} delay="0.24s" />
          <Person x={582} y={90} color={colorB} facing={-1} delay="0.08s" />
          <Person x={632} y={96} color={colorB} facing={-1} delay="0.2s" />
          <Person x={682} y={92} color={colorB} facing={-1} delay="0.32s" />

          <g className="tug-rope">
            <path
              d="M236 96 C 280 88, 330 104, 400 96 C 470 88, 520 104, 564 96"
              fill="none"
              stroke="#92400e"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <circle cx="400" cy="96" r="7" fill="#facc15" stroke="#92400e" strokeWidth="2" />
          </g>
        </g>
      </g>
    </svg>
  );
}
