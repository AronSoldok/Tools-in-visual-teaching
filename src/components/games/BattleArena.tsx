"use client";

import type { TeamId } from "@/store/gamesStore";

type Props = {
  colorA: string;
  colorB: string;
  scoreA: number;
  scoreB: number;
  winScore: number;
  lastCorrect: TeamId | null;
  lastCorrectAt: number;
};

type ShipState = "ok" | "fire" | "sunk";

function shipState(oppScore: number, winScore: number, index: number): ShipState {
  const stage = Math.min(6, Math.round((oppScore / Math.max(1, winScore)) * 6));
  const local = stage - index * 2;
  if (local >= 2) return "sunk";
  if (local >= 1) return "fire";
  return "ok";
}

function Fire() {
  return (
    <g className="ship-fire" aria-hidden>
      <path className="flame f1" d="M0 8 C -6 0, -2 -10, 0 -14 C 3 -8, 6 0, 0 8" />
      <path className="flame f2" d="M4 8 C 0 2, 4 -6, 7 -10 C 9 -4, 10 2, 4 8" />
      <path className="smoke s1" d="M-2 -12 C -8 -20, 2 -26, 6 -18" />
    </g>
  );
}

function Ship({
  x,
  y,
  color,
  flip,
  state,
}: {
  x: number;
  y: number;
  color: string;
  flip: boolean;
  state: ShipState;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      <g className={`battle-ship-inner ${state}`}>
        <ellipse className="ship-wake" cx="36" cy="34" rx="40" ry="7" />
        <path d="M4 18 L68 18 L58 32 L12 32 Z" fill={color} />
        <rect x="22" y="6" width="22" height="12" rx="2" fill={color} />
        <rect x="40" y="-8" width="3" height="16" fill="#7c2d12" />
        <polygon points="43,-8 43,4 56,-2" fill="#f8fafc" />
        <circle cx="18" cy="12" r="3" fill="#fde68a" />
        {state !== "ok" && (
          <g transform="translate(30 -6)">
            <Fire />
          </g>
        )}
      </g>
    </g>
  );
}

export function BattleArena({ colorA, colorB, scoreA, scoreB, winScore, lastCorrect, lastCorrectAt }: Props) {
  const leftStates = [0, 1, 2].map((i) => shipState(scoreB, winScore, i));
  const rightStates = [0, 1, 2].map((i) => shipState(scoreA, winScore, i));
  const score = lastCorrect === "a" ? scoreA : lastCorrect === "b" ? scoreB : 0;
  const stage = Math.min(6, Math.round((score / Math.max(1, winScore)) * 6));
  const targetIndex = Math.min(2, Math.max(0, Math.floor((stage - 1) / 2)));

  const shotFrom =
    lastCorrect === "a" ? { x: 150, y: 70 + targetIndex * 52 } : { x: 650, y: 70 + targetIndex * 52 };
  const shotTo =
    lastCorrect === "a" ? { x: 620, y: 78 + targetIndex * 52 } : { x: 180, y: 78 + targetIndex * 52 };

  return (
    <svg className="games-arena-svg battle-arena" viewBox="0 0 800 230" role="img" aria-label="Морской бой">
      <defs>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      <rect width="800" height="230" fill="url(#sea)" />
      <path
        className="sea-wave w1"
        d="M0 40 Q 40 28 80 40 T 160 40 T 240 40 T 320 40 T 400 40 T 480 40 T 560 40 T 640 40 T 720 40 T 800 40 V0 H0 Z"
      />
      <path
        className="sea-wave w2"
        d="M0 210 Q 50 198 100 210 T 200 210 T 300 210 T 400 210 T 500 210 T 600 210 T 700 210 T 800 210 V230 H0 Z"
      />

      {[0, 1, 2].map((i) => (
        <Ship key={`a-${i}`} x={48} y={48 + i * 52} color={colorA} flip={false} state={leftStates[i]} />
      ))}
      {[0, 1, 2].map((i) => (
        <Ship key={`b-${i}`} x={752} y={48 + i * 52} color={colorB} flip={true} state={rightStates[i]} />
      ))}

      {lastCorrect && (
        <circle
          key={lastCorrectAt}
          className="battle-shot"
          r="6"
          fill="#0f172a"
          style={{
            offsetPath: `path("M ${shotFrom.x} ${shotFrom.y} L ${shotTo.x} ${shotTo.y}")`,
          }}
        />
      )}
    </svg>
  );
}
