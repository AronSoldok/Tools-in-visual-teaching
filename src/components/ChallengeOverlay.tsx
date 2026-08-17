"use client";

import { useEffect, useRef, useState } from "react";
import { useBoardStore } from "@/store/boardStore";

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

const GREEN = ["#22c55e", "#4ade80", "#86efac", "#bbf7d0", "#fde047", "#ffffff"];

function spawnBurst(particles: Particle[], x: number, y: number) {
  const count = 42;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
    const speed = 2.2 + Math.random() * 4.8;
    const maxLife = 50 + Math.random() * 25;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.2,
      life: maxLife,
      maxLife,
      color: GREEN[Math.floor(Math.random() * GREEN.length)],
      size: 2.5 + Math.random() * 3,
    });
  }
}

function FireworksCanvas() {
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
    origins.forEach(([px, py], i) => {
      window.setTimeout(() => {
        spawnBurst(particles, canvas.width * px, canvas.height * py);
      }, i * 180);
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
      if (frame < 130 || particles.length > 0) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} className="challenge-fireworks" aria-hidden />;
}

export function ChallengeOverlay() {
  const feedback = useBoardStore((s) => s.feedback);
  const [fxKey, setFxKey] = useState(0);
  const [showFx, setShowFx] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!feedback) {
      setShowFx(false);
      setShowToast(false);
      return;
    }
    setFxKey((n) => n + 1);
    setShowFx(true);
    setShowToast(feedback.correct);
    const fxTimer = window.setTimeout(() => setShowFx(false), feedback.correct ? 2200 : 1400);
    const toastTimer = window.setTimeout(() => setShowToast(false), 3200);
    return () => {
      window.clearTimeout(fxTimer);
      window.clearTimeout(toastTimer);
    };
  }, [feedback]);

  if (!feedback) return null;

  return (
    <div className="challenge-overlay" aria-live="polite">
      {showFx && feedback.correct && <FireworksCanvas key={fxKey} />}
      {showFx && !feedback.correct && (
        <div className="challenge-cross" aria-hidden>
          ✕
        </div>
      )}
      {showToast && feedback.correct && (
        <div className="challenge-toast">Верно! Число собрано правильно.</div>
      )}
    </div>
  );
}
