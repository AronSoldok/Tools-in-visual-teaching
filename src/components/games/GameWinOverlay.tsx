"use client";

import { useEffect, useRef, useState } from "react";
import { useGamesStore } from "@/store/gamesStore";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
};

function spawnBurst(particles: Particle[], x: number, y: number, colors: string[]) {
  for (let i = 0; i < 46; i++) {
    const angle = (Math.PI * 2 * i) / 46 + Math.random() * 0.2;
    const speed = 2.2 + Math.random() * 4.8;
    const maxLife = 50 + Math.random() * 25;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.2,
      life: maxLife,
      maxLife,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2.5 + Math.random() * 3,
    });
  }
}

function Fireworks({ colors }: { colors: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = [];
    const origins = [
      [0.25, 0.35],
      [0.5, 0.28],
      [0.75, 0.38],
      [0.4, 0.5],
      [0.62, 0.48],
    ];
    const timers: number[] = [];
    origins.forEach(([px, py], i) => {
      timers.push(
        window.setTimeout(() => {
          spawnBurst(particles, canvas.width * px, canvas.height * py, colors);
        }, i * 180),
      );
    });

    let frame = 0;
    let raf = 0;
    const tick = () => {
      frame += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06;
        p.life -= 1;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (frame < 160 || particles.length > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
      timers.forEach((id) => window.clearTimeout(id));
    };
    // Mounted once per winner via key on <Fireworks />
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className="challenge-fireworks" aria-hidden />;
}

export function GameWinOverlay() {
  const winner = useGamesStore((s) => s.winner);
  const screen = useGamesStore((s) => s.screen);
  const kind = useGamesStore((s) => s.kind);
  const teamA = useGamesStore((s) => s.teamA);
  const teamB = useGamesStore((s) => s.teamB);
  const replay = useGamesStore((s) => s.replay);
  const backToPick = useGamesStore((s) => s.backToPick);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!winner || screen !== "play") {
      setReady(false);
      return;
    }
    if (kind === "fight" && winner !== "draw") {
      setReady(false);
      const id = window.setTimeout(() => setReady(true), 1400);
      return () => window.clearTimeout(id);
    }
    setReady(true);
  }, [winner, screen, kind]);

  if (!winner || screen !== "play" || !ready) return null;

  const isDraw = winner === "draw";
  const name = winner === "a" ? teamA.name : winner === "b" ? teamB.name : "";
  const color = winner === "a" ? teamA.color : winner === "b" ? teamB.color : "#e07a3a";

  return (
    <div className="game-win-overlay">
      {!isDraw && <Fireworks key={color} colors={[color, "#facc15", "#ffffff", "#fde68a", "#fb923c"]} />}
      <div className="app-dialog-backdrop" role="presentation">
        <div className="app-dialog game-win-dialog" role="alertdialog" aria-modal="true" aria-labelledby="game-win-title">
          <p id="game-win-title" className="app-dialog-message">
            {isDraw ? "Ничья!" : `Команда ${name} победила!`}
          </p>
          <div className="app-dialog-actions">
            <button type="button" className="action-btn action-btn-confirm" onClick={replay}>
              Ещё раз
            </button>
            <button type="button" className="action-btn" onClick={backToPick}>
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
