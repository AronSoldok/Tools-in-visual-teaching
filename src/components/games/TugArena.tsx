"use client";

import { Container, Graphics, Sprite } from "pixi.js";
import { useCallback, useRef } from "react";
import { PixelStage, type PixelSceneApi } from "./PixelStage";
import type { TeamId } from "@/store/gamesStore";

const ASSETS = {
  heroA: "/games/tug/hero_a.png",
  heroA2: "/games/tug/hero_a2.png",
  heroB: "/games/tug/hero_b.png",
  heroB2: "/games/tug/hero_b2.png",
  grass: "/games/tug/grass.png",
  sky: "/games/tug/sky.png",
};

type Props = {
  colorA: string;
  colorB: string;
  scoreA: number;
  scoreB: number;
  winScore: number;
  lastCorrect: TeamId | null;
  lastCorrectAt: number;
};

function hexToNum(hex: string) {
  return Number.parseInt(hex.replace("#", ""), 16);
}

export function TugArena(props: Props) {
  const live = useRef(props);
  live.current = props;

  const setup = useCallback(({ app, textures }: PixelSceneApi) => {
    const world = new Container();
    app.stage.addChild(world);
    const bg = new Graphics();
    const ground = new Graphics();
    const rope = new Graphics();
    const flag = new Graphics();
    world.addChild(bg, ground, flag, rope);

    const makeCrew = (tex: typeof textures.heroA, tex2: typeof textures.heroA2, tint: number, flip: boolean) => {
      return [0, 1, 2].map((i) => {
        const s = new Sprite(tex);
        s.anchor.set(0.5, 1);
        s.scale.set(flip ? -5 : 5, 5);
        s.tint = tint;
        s.zIndex = i;
        (s as Sprite & { alt: typeof tex2 }).alt = tex2;
        (s as Sprite & { base: typeof tex }).base = tex;
        world.addChild(s);
        return s;
      });
    };

    const crewA = makeCrew(textures.heroA, textures.heroA2, hexToNum(live.current.colorA), false);
    const crewB = makeCrew(textures.heroB, textures.heroB2, hexToNum(live.current.colorB), true);

    const layout = () => {
      const w = app.screen.width;
      const h = app.screen.height;
      bg.clear().rect(0, 0, w, h).fill(0x7dd3fc);
      bg.rect(0, h * 0.55, w, h * 0.45).fill(0x4ade80);
      ground.clear().rect(0, h * 0.78, w, h * 0.22).fill(0x22c55e);

      const mid = w / 2;
      flag.clear().rect(mid - 4, h * 0.18, 8, h * 0.55).fill(0x7c2d12);
      flag.poly([mid + 4, h * 0.18, mid + 4, h * 0.34, mid + 56, h * 0.26]).fill(0xf97316);
    };

    layout();
    const onResize = () => layout();
    app.renderer.on("resize", onResize);

    let yank = 0;
    let lastBurst = 0;
    const tick = () => {
      const p = live.current;
      const w = app.screen.width;
      const h = app.screen.height;
      const lead = Math.max(-1, Math.min(1, (p.scoreA - p.scoreB) / Math.max(1, p.winScore)));
      const shift = lead * (w * 0.16);
      if (p.lastCorrectAt !== lastBurst && p.lastCorrect) {
        lastBurst = p.lastCorrectAt;
        yank = p.lastCorrect === "a" ? -22 : 22;
      }
      yank *= 0.82;
      const x = shift + yank;
      const baseY = h * 0.78;

      crewA.forEach((s, i) => {
        s.tint = hexToNum(p.colorA);
        s.x = w * 0.22 + i * 46 + x;
        s.y = baseY + Math.sin(app.ticker.lastTime / 160 + i) * 3;
        s.rotation = Math.sin(app.ticker.lastTime / 180 + i) * 0.12;
        s.texture = Math.sin(app.ticker.lastTime / 120 + i) > 0 ? textures.heroA : textures.heroA2;
      });
      crewB.forEach((s, i) => {
        s.tint = hexToNum(p.colorB);
        s.x = w * 0.78 - i * 46 + x;
        s.y = baseY + Math.sin(app.ticker.lastTime / 150 + i) * 3;
        s.rotation = -Math.sin(app.ticker.lastTime / 180 + i) * 0.12;
        s.texture = Math.sin(app.ticker.lastTime / 120 + i) > 0 ? textures.heroB : textures.heroB2;
      });

      const leftHand = crewA[2].x + 18;
      const rightHand = crewB[2].x - 18;
      const ropeY = baseY - 28;
      rope.clear();
      rope.moveTo(leftHand, ropeY);
      for (let i = 1; i <= 12; i++) {
        const t = i / 12;
        rope.lineTo(leftHand + (rightHand - leftHand) * t, ropeY + Math.sin(t * Math.PI * 4 + app.ticker.lastTime / 90) * 4);
      }
      rope.stroke({ width: 8, color: 0x92400e });
      rope.circle((leftHand + rightHand) / 2, ropeY, 7).fill(0xfacc15);
    };
    app.ticker.add(tick);

    return () => {
      app.ticker.remove(tick);
      app.renderer.off("resize", onResize);
    };
  }, []);

  return <PixelStage background={0x7dd3fc} assets={ASSETS} setup={setup} />;
}
