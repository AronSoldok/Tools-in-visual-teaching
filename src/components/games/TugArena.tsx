"use client";

import { Container, Graphics, Sprite } from "pixi.js";
import { useCallback, useRef } from "react";
import { PixelStage, type PixelSceneApi } from "./PixelStage";
import type { TeamId } from "@/store/gamesStore";

const ASSETS = {
  heroA: "/games/tug/player_walk1.png",
  heroA2: "/games/tug/player_walk2.png",
  heroB: "/games/tug/soldier_walk1.png",
  heroB2: "/games/tug/soldier_walk2.png",
};

const CREW = 3;
const GAP = 40;

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
    world.sortableChildren = true;
    app.stage.addChild(world);
    const bg = new Graphics();
    const ground = new Graphics();
    const rope = new Graphics();
    const flag = new Graphics();
    bg.zIndex = 0;
    ground.zIndex = 1;
    rope.zIndex = 20;
    flag.zIndex = 30;
    world.addChild(bg, ground, flag, rope);

    const makeCrew = () => {
      return Array.from({ length: CREW }, (_, i) => {
        const s = new Sprite(textures.heroA);
        s.anchor.set(0.5, 1);
        s.zIndex = 10 + i;
        world.addChild(s);
        return s;
      });
    };

    const crewA = makeCrew();
    const crewB = makeCrew();

    const layout = () => {
      const w = app.screen.width;
      const h = app.screen.height;
      bg.clear().rect(0, 0, w, h).fill(0x7dd3fc);
      bg.rect(0, h * 0.55, w, h * 0.45).fill(0x4ade80);
      ground.clear().rect(0, h * 0.78, w, h * 0.22).fill(0x22c55e);

      const mid = w / 2;
      flag.clear().rect(mid - 4, h * 0.18, 8, h * 0.6).fill(0x7c2d12);
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
      const mid = w / 2;
      const baseA = w * 0.22;
      const baseB = w * 0.78;
      const aInner = baseA + (CREW - 1) * GAP;
      const bInner = baseB - (CREW - 1) * GAP;
      const spare = Math.max(24, Math.min(aInner - mid, bInner - mid) * 0.92);
      const lead = Math.max(-1, Math.min(1, (p.scoreB - p.scoreA) / Math.max(1, p.winScore)));
      const shift = lead * spare;
      if (p.lastCorrectAt !== lastBurst && p.lastCorrect) {
        lastBurst = p.lastCorrectAt;
        yank = p.lastCorrect === "a" ? -22 : 22;
      }
      yank *= 0.82;
      const x = shift + yank;
      const baseY = h * 0.78;
      const sc = Math.min(0.82, (h * 0.52) / 110);

      crewA.forEach((s, i) => {
        s.tint = hexToNum(p.colorA);
        s.scale.set(sc, sc);
        s.x = baseA + i * GAP + x;
        s.y = baseY + Math.sin(app.ticker.lastTime / 160 + i) * 2;
        s.rotation = Math.sin(app.ticker.lastTime / 180 + i) * 0.08;
        s.texture = Math.sin(app.ticker.lastTime / 120 + i) > 0 ? textures.heroA : textures.heroA2;
      });
      crewB.forEach((s, i) => {
        s.tint = hexToNum(p.colorB);
        s.scale.set(-sc, sc);
        s.x = baseB - i * GAP + x;
        s.y = baseY + Math.sin(app.ticker.lastTime / 150 + i) * 2;
        s.rotation = -Math.sin(app.ticker.lastTime / 180 + i) * 0.08;
        s.texture = Math.sin(app.ticker.lastTime / 120 + i) > 0 ? textures.heroB : textures.heroB2;
      });

      const leftHand = crewA[CREW - 1].x + 16 * sc;
      const rightHand = crewB[CREW - 1].x - 16 * sc;
      const ropeY = baseY - 36 * sc;
      rope.clear();
      rope.moveTo(leftHand, ropeY);
      for (let i = 1; i <= 12; i++) {
        const t = i / 12;
        rope.lineTo(
          leftHand + (rightHand - leftHand) * t,
          ropeY + Math.sin(t * Math.PI * 4 + app.ticker.lastTime / 90) * 4,
        );
      }
      rope.stroke({ width: 8, color: 0x92400e });
    };
    app.ticker.add(tick);

    return () => {
      app.ticker.remove(tick);
      app.renderer.off("resize", onResize);
    };
  }, []);

  return <PixelStage background={0x7dd3fc} assets={ASSETS} setup={setup} />;
}
