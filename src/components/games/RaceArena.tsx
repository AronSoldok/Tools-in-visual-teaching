"use client";

import { Container, Graphics, Sprite, Text } from "pixi.js";
import { useCallback, useRef } from "react";
import { PixelStage, type PixelSceneApi } from "./PixelStage";
import type { TeamId } from "@/store/gamesStore";

const ASSETS = {
  formula: "/games/race/formula.png",
  pickup: "/games/race/pickup.png",
  barrier: "/games/race/barrier.png",
};

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

type Live = Props;

function hexToNum(hex: string) {
  return Number.parseInt(hex.replace("#", ""), 16);
}

export function RaceArena(props: Props) {
  const live = useRef<Live>(props);
  live.current = props;

  const setup = useCallback(({ app, textures }: PixelSceneApi) => {
    const world = new Container();
    app.stage.addChild(world);

    const sky = new Graphics();
    const hills = new Graphics();
    const roadA = new Graphics();
    const roadB = new Graphics();
    const dashes = new Graphics();
    const finish = new Graphics();
    world.addChild(sky, hills, roadA, roadB, dashes, finish);

    const labelA = new Text({
      text: live.current.nameA,
      style: { fontFamily: "Nunito, sans-serif", fontSize: 18, fontWeight: "800", fill: live.current.colorA },
    });
    const labelB = new Text({
      text: live.current.nameB,
      style: { fontFamily: "Nunito, sans-serif", fontSize: 18, fontWeight: "800", fill: live.current.colorB },
    });
    world.addChild(labelA, labelB);

    const carA = new Sprite(textures.formula);
    const carB = new Sprite(textures.pickup);
    carA.anchor.set(0, 0.5);
    carB.anchor.set(0, 0.5);
    carA.scale.set(4);
    carB.scale.set(4);
    carA.tint = hexToNum(live.current.colorA);
    carB.tint = hexToNum(live.current.colorB);
    const startA = new Sprite(textures.barrier);
    const startB = new Sprite(textures.barrier);
    startA.anchor.set(0.5, 1);
    startB.anchor.set(0.5, 1);
    startA.scale.set(3);
    startB.scale.set(3);
    world.addChild(startA, startB, carA, carB);

    const dust: { g: Graphics; life: number; x: number; y: number }[] = [];

    const layout = () => {
      const w = app.screen.width;
      const h = app.screen.height;
      const laneH = Math.max(56, h * 0.32);
      const yA = h * 0.34;
      const yB = h * 0.72;

      sky.clear().rect(0, 0, w, h).fill(0x7dd3fc);
      hills.clear();
      hills.poly([0, h * 0.22, w * 0.18, h * 0.08, w * 0.36, h * 0.2, w * 0.55, h * 0.06, w * 0.78, h * 0.18, w, h * 0.1, w, h, 0, h]).fill(0x4ade80);
      hills.poly([0, h * 0.28, w * 0.25, h * 0.16, w * 0.5, h * 0.26, w * 0.8, h * 0.14, w, h * 0.24, w, h, 0, h]).fill(0x22c55e);

      for (const [gfx, y] of [
        [roadA, yA],
        [roadB, yB],
      ] as const) {
        gfx.clear().roundRect(0, y - laneH / 2, w, laneH, 0).fill(0x3f3f46);
        gfx.rect(0, y - laneH / 2, w, 6).fill(0xfbbf24);
        gfx.rect(0, y + laneH / 2 - 6, w, 6).fill(0xfbbf24);
      }

      dashes.clear();
      const dashW = 28;
      const gap = 22;
      for (let x = 16; x < w - 40; x += dashW + gap) {
        dashes.rect(x, yA - 3, dashW, 6).fill(0xf8fafc);
        dashes.rect(x, yB - 3, dashW, 6).fill(0xf8fafc);
      }

      finish.clear();
      const fw = 28;
      const cell = 10;
      for (let row = 0; row < Math.ceil(laneH / cell); row++) {
        for (let col = 0; col < 3; col++) {
          const on = (row + col) % 2 === 0;
          finish.rect(w - fw + col * (fw / 3), yA - laneH / 2 + row * cell, fw / 3, cell).fill(on ? 0x0f172a : 0xf8fafc);
          finish.rect(w - fw + col * (fw / 3), yB - laneH / 2 + row * cell, fw / 3, cell).fill(on ? 0x0f172a : 0xf8fafc);
        }
      }

      labelA.position.set(12, yA - laneH / 2 - 24);
      labelB.position.set(12, yB - laneH / 2 - 24);
      startA.position.set(18, yA + laneH / 2 - 8);
      startB.position.set(18, yB + laneH / 2 - 8);

      const { scoreA, scoreB, winScore } = live.current;
      const maxX = w - fw - carA.width - 12;
      const minX = 24;
      carA.position.set(minX + (scoreA / Math.max(1, winScore)) * (maxX - minX), yA);
      carB.position.set(minX + (scoreB / Math.max(1, winScore)) * (maxX - minX), yB);
    };

    layout();
    const onResize = () => layout();
    app.renderer.on("resize", onResize);

    let lastBurst = 0;
    const tick = () => {
      const p = live.current;
      labelA.text = p.nameA;
      labelB.text = p.nameB;
      labelA.style.fill = p.colorA;
      labelB.style.fill = p.colorB;
      carA.tint = hexToNum(p.colorA);
      carB.tint = hexToNum(p.colorB);

      const w = app.screen.width;
      const h = app.screen.height;
      const yA = h * 0.34;
      const yB = h * 0.72;
      const maxX = w - 28 - carA.width - 12;
      const minX = 24;
      const targetA = minX + (p.scoreA / Math.max(1, p.winScore)) * (maxX - minX);
      const targetB = minX + (p.scoreB / Math.max(1, p.winScore)) * (maxX - minX);
      carA.x += (targetA - carA.x) * 0.18;
      carB.x += (targetB - carB.x) * 0.18;
      carA.y = yA + Math.sin(app.ticker.lastTime / 140) * 1.5;
      carB.y = yB + Math.sin(app.ticker.lastTime / 160) * 1.5;

      if (p.lastCorrectAt !== lastBurst && p.lastCorrect) {
        lastBurst = p.lastCorrectAt;
        const src = p.lastCorrect === "a" ? carA : carB;
        for (let i = 0; i < 10; i++) {
          const g = new Graphics().circle(0, 0, 3 + Math.random() * 3).fill(0xcbd5e1);
          g.position.set(src.x + 8, src.y + 10);
          world.addChild(g);
          dust.push({ g, life: 18 + Math.random() * 10, x: -2 - Math.random() * 3, y: (Math.random() - 0.5) * 2 });
        }
      }
      for (let i = dust.length - 1; i >= 0; i--) {
        const d = dust[i];
        d.life -= 1;
        d.g.x += d.x;
        d.g.y += d.y;
        d.g.alpha = Math.max(0, d.life / 20);
        if (d.life <= 0) {
          d.g.destroy();
          dust.splice(i, 1);
        }
      }
    };
    app.ticker.add(tick);

    return () => {
      app.ticker.remove(tick);
      app.renderer.off("resize", onResize);
    };
  }, []);

  return <PixelStage background={0x7dd3fc} assets={ASSETS} setup={setup} />;
}
