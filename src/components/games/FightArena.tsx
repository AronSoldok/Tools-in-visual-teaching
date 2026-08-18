"use client";

import { Container, Graphics, Sprite, Texture } from "pixi.js";
import { useCallback, useRef } from "react";
import { PixelStage, type PixelSceneApi } from "./PixelStage";
import type { FightHit, FightPhase, TeamId, Winner } from "@/store/gamesStore";
import { FIGHT_MAX_HP, FIGHT_WINDOW_MS } from "@/store/gamesStore";

const ASSETS = {
  aIdle: "/games/fight/a_idle.png",
  aIdle2: "/games/fight/a_idle2.png",
  aWindup: "/games/fight/a_windup.png",
  aPunch: "/games/fight/a_punch.png",
  aHurt: "/games/fight/a_hurt.png",
  aBlock: "/games/fight/a_block.png",
  aClinch: "/games/fight/a_clinch.png",
  aKick: "/games/fight/a_kick.png",
  aKo: "/games/fight/a_ko.png",
  aHeadbutt: "/games/fight/a_headbutt.png",
  aThrow: "/games/fight/a_throw.png",
  aDaze: "/games/fight/a_daze.png",
  bIdle: "/games/fight/b_idle.png",
  bIdle2: "/games/fight/b_idle2.png",
  bWindup: "/games/fight/b_windup.png",
  bPunch: "/games/fight/b_punch.png",
  bHurt: "/games/fight/b_hurt.png",
  bBlock: "/games/fight/b_block.png",
  bClinch: "/games/fight/b_clinch.png",
  bKick: "/games/fight/b_kick.png",
  bKo: "/games/fight/b_ko.png",
  bHeadbutt: "/games/fight/b_headbutt.png",
  bThrow: "/games/fight/b_throw.png",
  bDaze: "/games/fight/b_daze.png",
};

const HIT_MS = 520;
const LERP = 0.18;

type Pose = "idle" | "windup" | "punch" | "hurt" | "block" | "clinch" | "kick" | "ko" | "headbutt" | "throw" | "daze";

type Props = {
  colorA: string;
  colorB: string;
  hpA: number;
  hpB: number;
  phase: FightPhase;
  actor: TeamId | null;
  until: number;
  lastHit: FightHit | null;
  winner: Winner;
};

function hexToNum(hex: string) {
  return Number.parseInt(hex.replace("#", ""), 16);
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
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

function koPose(side: TeamId, winner: "a" | "b", variant: number, elapsed: number): Pose {
  const isWin = side === winner;
  if (variant === 0) {
    if (elapsed < 450) return isWin ? "kick" : "hurt";
    return isWin ? "idle" : "ko";
  }
  if (variant === 1) {
    if (elapsed < 380) return isWin ? "throw" : "hurt";
    return isWin ? "idle" : "ko";
  }
  if (elapsed < 280) return isWin ? "headbutt" : "daze";
  if (elapsed < 700) return isWin ? "punch" : "hurt";
  return isWin ? "idle" : "ko";
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
      kick: textures.aKick,
      ko: textures.aKo,
      headbutt: textures.aHeadbutt,
      throw: textures.aThrow,
      daze: textures.aDaze,
    };
    const texB: Record<Pose, Texture> = {
      idle: textures.bIdle,
      windup: textures.bWindup,
      punch: textures.bPunch,
      hurt: textures.bHurt,
      block: textures.bBlock,
      clinch: textures.bClinch,
      kick: textures.bKick,
      ko: textures.bKo,
      headbutt: textures.bHeadbutt,
      throw: textures.bThrow,
      daze: textures.bDaze,
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

    let xA = 0;
    let xB = 0;
    let yA = 0;
    let yB = 0;
    let placed = false;
    let koStartedAt = 0;
    let koVariant = 0;

    const tick = () => {
      const p = live.current;
      const w = app.screen.width;
      const h = app.screen.height;
      const now = Date.now();
      const floor = h * 0.78;
      const sc = Math.min(4.2, (h * 0.55) / 32);
      const finishing = p.winner === "a" || p.winner === "b";
      if (finishing) {
        if (!koStartedAt) {
          koStartedAt = now;
          koVariant = (p.lastHit?.at ?? now) % 3;
        }
      } else {
        koStartedAt = 0;
      }
      const koElapsed = finishing ? now - koStartedAt : 0;
      const koWinner = p.winner as "a" | "b";
      const poseA = finishing ? koPose("a", koWinner, koVariant, koElapsed) : poseOf("a", p, now);
      const poseB = finishing ? koPose("b", koWinner, koVariant, koElapsed) : poseOf("b", p, now);
      const idleSwap = Math.sin(app.ticker.lastTime / 180) > 0;

      fighterA.tint = hexToNum(p.colorA);
      fighterB.tint = hexToNum(p.colorB);
      fighterA.scale.set(sc, sc);
      fighterB.scale.set(-sc, sc);
      fighterA.texture = poseA === "idle" && idleSwap ? textures.aIdle2 : texA[poseA];
      fighterB.texture = poseB === "idle" && idleSwap ? textures.bIdle2 : texB[poseB];

      let targetA = w * 0.32;
      let targetB = w * 0.68;
      let hopA = 0;
      let hopB = 0;
      const shake = p.phase === "grapple" && p.lastHit && now - p.lastHit.at < HIT_MS ? Math.sin(now / 40) * 4 : 0;

      if (finishing) {
        targetA = w * 0.44;
        targetB = w * 0.56;
        if (koVariant === 1 && koElapsed > 280 && koElapsed < 900) {
          if (p.winner === "a") targetB = w * 0.78;
          else targetA = w * 0.22;
        }
        if (poseA === "hurt" || poseA === "daze") hopA = Math.sin(Math.min(1, koElapsed / 280) * Math.PI) * 8;
        if (poseB === "hurt" || poseB === "daze") hopB = Math.sin(Math.min(1, koElapsed / 280) * Math.PI) * 8;
        if (poseA === "ko") hopA = 2;
        if (poseB === "ko") hopB = 2;
      } else if (poseA === "clinch" || poseB === "clinch") {
        targetA = w * 0.46 + shake;
        targetB = w * 0.54 + shake;
      } else if (p.lastHit && now - p.lastHit.at < HIT_MS) {
        const fromA = p.lastHit.from === "a";
        targetA = fromA ? w * 0.44 : p.lastHit.kind === "block" ? w * 0.44 : w * 0.4;
        targetB = fromA ? (p.lastHit.kind === "block" ? w * 0.56 : w * 0.6) : w * 0.56;
        if (poseA === "hurt") hopA = Math.sin(((now - p.lastHit.at) / HIT_MS) * Math.PI) * 6;
        if (poseB === "hurt") hopB = Math.sin(((now - p.lastHit.at) / HIT_MS) * Math.PI) * 6;
      } else if (p.phase === "windup" && p.actor === "a") {
        targetA = w * 0.4;
        targetB = w * 0.66;
      } else if (p.phase === "windup" && p.actor === "b") {
        targetA = w * 0.34;
        targetB = w * 0.6;
      } else if (p.phase === "miss" && p.actor === "a") {
        targetA = w * 0.36;
        targetB = w * 0.68;
      } else if (p.phase === "miss" && p.actor === "b") {
        targetA = w * 0.32;
        targetB = w * 0.64;
      }

      if (!placed) {
        xA = targetA;
        xB = targetB;
        yA = floor;
        yB = floor;
        placed = true;
      } else {
        xA = lerp(xA, targetA, LERP);
        xB = lerp(xB, targetB, LERP);
        yA = lerp(yA, floor - hopA, LERP);
        yB = lerp(yB, floor - hopB, LERP);
      }

      fighterA.position.set(xA, yA);
      fighterB.position.set(xB, yB);

      const barY = 10;
      const barH = 10;
      const gap = 16;
      const barW = (w - gap * 3) / 2;
      bars.clear();
      bars.roundRect(gap, barY, barW, barH, 4).fill(0x111827);
      bars.roundRect(gap, barY, barW * (p.hpA / FIGHT_MAX_HP), barH, 4).fill(hexToNum(p.colorA));
      bars.roundRect(w - gap - barW, barY, barW, barH, 4).fill(0x111827);
      bars.roundRect(w - gap - barW, barY, barW * (p.hpB / FIGHT_MAX_HP), barH, 4).fill(hexToNum(p.colorB));
      if ((p.phase === "windup" || p.phase === "miss") && p.until > now && !finishing) {
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
