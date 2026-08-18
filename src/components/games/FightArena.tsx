"use client";

import { Container, Graphics, Sprite, Texture } from "pixi.js";
import { useCallback, useRef } from "react";
import { PixelStage, type PixelSceneApi } from "./PixelStage";
import type { FightHit, FightPhase, TeamId } from "@/store/gamesStore";
import { FIGHT_MAX_HP, FIGHT_WINDOW_MS } from "@/store/gamesStore";

const ASSETS = {
  aIdle: "/games/fight/a_idle.png",
  aIdle2: "/games/fight/a_idle2.png",
  aWindup: "/games/fight/a_windup.png",
  aPunch: "/games/fight/a_punch.png",
  aHurt: "/games/fight/a_hurt.png",
  aBlock: "/games/fight/a_block.png",
  aClinch: "/games/fight/a_clinch.png",
  bIdle: "/games/fight/b_idle.png",
  bIdle2: "/games/fight/b_idle2.png",
  bWindup: "/games/fight/b_windup.png",
  bPunch: "/games/fight/b_punch.png",
  bHurt: "/games/fight/b_hurt.png",
  bBlock: "/games/fight/b_block.png",
  bClinch: "/games/fight/b_clinch.png",
};

const HIT_MS = 520;

type Pose = "idle" | "windup" | "punch" | "hurt" | "block" | "clinch";

type Props = {
  colorA: string;
  colorB: string;
  hpA: number;
  hpB: number;
  phase: FightPhase;
  actor: TeamId | null;
  until: number;
  lastHit: FightHit | null;
};

function hexToNum(hex: string) {
  return Number.parseInt(hex.replace("#", ""), 16);
}

function poseOf(side: TeamId, p: Props, now: number): Pose {
  const hitFresh = p.lastHit && now - p.lastHit.at < HIT_MS;
  if (p.phase === "grapple") return "clinch";
  if (hitFresh && p.lastHit) {
    const h = p.lastHit;
    if (h.kind === "grapple") return "clinch";
    if (h.kind === "block") return side === h.from ? "punch" : side === h.to ? "block" : "idle";
    if (h.kind === "hit" || h.kind === "punish") return side === h.from ? "punch" : side === h.to ? "hurt" : "idle";
    if (h.kind === "counter") return side === h.from ? "punch" : side === h.to ? "hurt" : "idle";
  }
  if (p.phase === "windup" && p.actor) return side === p.actor ? "windup" : "idle";
  if (p.phase === "miss" && p.actor) return side === p.actor ? "windup" : "idle";
  return "idle";
}

export function FightArena(props: Props) {
  const live = useRef(props);
  live.current = props;

  const setup = useCallback(({ app, textures }: PixelSceneApi) => {
    const world = new Container();
    app.stage.addChild(world);
    const bg = new Graphics();
    const bars = new Graphics();
    world.addChild(bg);

    const fighterA = new Sprite(textures.aIdle);
    const fighterB = new Sprite(textures.bIdle);
    fighterA.anchor.set(0.5, 1);
    fighterB.anchor.set(0.5, 1);
    world.addChild(fighterA, fighterB, bars);

    const texA: Record<Pose, Texture> = {
      idle: textures.aIdle,
      windup: textures.aWindup,
      punch: textures.aPunch,
      hurt: textures.aHurt,
      block: textures.aBlock,
      clinch: textures.aClinch,
    };
    const texB: Record<Pose, Texture> = {
      idle: textures.bIdle,
      windup: textures.bWindup,
      punch: textures.bPunch,
      hurt: textures.bHurt,
      block: textures.bBlock,
      clinch: textures.bClinch,
    };

    const layout = () => {
      const w = app.screen.width;
      const h = app.screen.height;
      bg.clear().rect(0, 0, w, h).fill(0x1e293b);
      bg.rect(0, 0, w, h * 0.42).fill(0x334155);
      bg.rect(0, h * 0.78, w, h * 0.22).fill(0x0f172a);
      bg.rect(0, h * 0.76, w, 4).fill(0xf59e0b);
    };
    layout();
    const onResize = () => layout();
    app.renderer.on("resize", onResize);

    const tick = () => {
      const p = live.current;
      const w = app.screen.width;
      const h = app.screen.height;
      const now = Date.now();
      const floor = h * 0.78;
      const sc = Math.min(4.2, (h * 0.55) / 32);
      const poseA = poseOf("a", p, now);
      const poseB = poseOf("b", p, now);
      const idleSwap = Math.sin(app.ticker.lastTime / 180) > 0;

      fighterA.tint = hexToNum(p.colorA);
      fighterB.tint = hexToNum(p.colorB);
      fighterA.scale.set(sc, sc);
      fighterB.scale.set(-sc, sc);
      fighterA.texture = poseA === "idle" && idleSwap ? textures.aIdle2 : texA[poseA];
      fighterB.texture = poseB === "idle" && idleSwap ? textures.bIdle2 : texB[poseB];

      let xA = w * 0.28;
      let xB = w * 0.72;
      if (poseA === "clinch" || poseB === "clinch") {
        const shake = p.lastHit && now - p.lastHit.at < HIT_MS ? Math.sin(now / 40) * 4 : 0;
        xA = w * 0.46 + shake;
        xB = w * 0.54 + shake;
      } else if (poseA === "punch") {
        xA = w * 0.42;
      } else if (poseA === "windup" && p.phase === "miss") {
        xA = w * 0.34;
      } else if (poseA === "windup") {
        xA = w * 0.32;
      }
      if (poseB === "punch") {
        xB = w * 0.58;
      } else if (poseB === "windup" && p.phase === "miss") {
        xB = w * 0.66;
      } else if (poseB === "windup") {
        xB = w * 0.68;
      }

      fighterA.position.set(xA, floor);
      fighterB.position.set(xB, floor);

      const barY = 10;
      const barH = 10;
      const gap = 16;
      const barW = (w - gap * 3) / 2;
      bars.clear();
      bars.roundRect(gap, barY, barW, barH, 4).fill(0x111827);
      bars.roundRect(gap, barY, barW * (p.hpA / FIGHT_MAX_HP), barH, 4).fill(hexToNum(p.colorA));
      bars.roundRect(w - gap - barW, barY, barW, barH, 4).fill(0x111827);
      bars.roundRect(w - gap - barW, barY, barW * (p.hpB / FIGHT_MAX_HP), barH, 4).fill(hexToNum(p.colorB));
      if ((p.phase === "windup" || p.phase === "miss") && p.until > now) {
        const left = Math.max(0, Math.min(1, (p.until - now) / FIGHT_WINDOW_MS));
        bars.roundRect(w / 2 - 40, 28, 80, 5, 2).fill(0x111827);
        bars.roundRect(w / 2 - 40, 28, 80 * left, 5, 2).fill(0xfacc15);
      }
    };
    app.ticker.add(tick);

    return () => {
      app.ticker.remove(tick);
      app.renderer.off("resize", onResize);
    };
  }, []);

  return <PixelStage background={0x1e293b} assets={ASSETS} setup={setup} />;
}
