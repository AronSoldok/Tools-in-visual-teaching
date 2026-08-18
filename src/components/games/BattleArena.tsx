"use client";

import { Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import { useCallback, useRef } from "react";
import { PixelStage, type PixelSceneApi } from "./PixelStage";
import type { TeamId } from "@/store/gamesStore";

const ASSETS = {
  hull: "/games/battle/hull.png",
  wreck: "/games/battle/wreck.png",
  flame: "/games/battle/flame.png",
  ball: "/games/battle/ball.png",
};

const SHIP_SCALES = [0.42, 0.58, 0.78];
const SUNK_FLAME_MS = 480;
const FLAME_FRAMES = 8;
const FLAME_SIZE = 32;

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

function hexToNum(hex: string) {
  return Number.parseInt(hex.replace("#", ""), 16);
}

function sliceFlame(sheet: Texture) {
  return Array.from({ length: FLAME_FRAMES }, (_, i) => {
    return new Texture({
      source: sheet.source,
      frame: new Rectangle(0, i * FLAME_SIZE, FLAME_SIZE, FLAME_SIZE),
    });
  });
}

export function BattleArena(props: Props) {
  const live = useRef(props);
  live.current = props;

  const setup = useCallback(({ app, textures }: PixelSceneApi) => {
    const world = new Container();
    app.stage.addChild(world);
    const sky = new Graphics();
    const water = new Graphics();
    world.addChild(sky, water);

    const flames = sliceFlame(textures.flame);

    const makeShip = (left: boolean, size: number) => {
      const hull = new Sprite(textures.hull);
      hull.anchor.set(0.5, 1);
      hull.scale.set(left ? size : -size, size);
      const fire = new Sprite(flames[0]);
      fire.anchor.set(0.5, 1);
      fire.scale.set(size * 1.8);
      fire.visible = false;
      fire.blendMode = "add";
      world.addChild(hull, fire);
      return { hull, fire, size, left, sunkSince: 0 };
    };

    const left = SHIP_SCALES.map((size) => makeShip(true, size));
    const right = SHIP_SCALES.map((size) => makeShip(false, size));

    const shot = new Sprite(textures.ball);
    shot.anchor.set(0.5);
    shot.scale.set(2);
    shot.visible = false;
    world.addChild(shot);
    let shotT = 1;
    let shotFrom = { x: 0, y: 0 };
    let shotTo = { x: 0, y: 0 };

    const layout = () => {
      const w = app.screen.width;
      const h = app.screen.height;
      sky.clear().rect(0, 0, w, h).fill(0x7dd3fc);
      sky.rect(0, 0, w, h * 0.28).fill(0xbae6fd);
    };

    layout();
    const onResize = () => layout();
    app.renderer.on("resize", onResize);

    let lastBurst = 0;
    const tick = () => {
      const p = live.current;
      const w = app.screen.width;
      const h = app.screen.height;
      const waterY = h * 0.68;
      const t = app.ticker.lastTime;

      water.clear().rect(0, waterY, w, h - waterY).fill(0x0284c7);
      water.moveTo(0, waterY);
      for (let x = 0; x <= w; x += 10) {
        water.lineTo(x, waterY + Math.sin(x / 16 + t / 180) * 3);
      }
      water.lineTo(w, h);
      water.lineTo(0, h);
      water.closePath();
      water.fill(0x0369a1);
      water.rect(0, waterY + 10, w, 6).fill({ color: 0x38bdf8, alpha: 0.35 });

      const leftStates = [0, 1, 2].map((i) => shipState(p.scoreB, p.winScore, i));
      const rightStates = [0, 1, 2].map((i) => shipState(p.scoreA, p.winScore, i));
      const flameTex = flames[Math.floor(t / 70) % FLAME_FRAMES];

      const place = (fleet: typeof left, states: ShipState[], side: "l" | "r") => {
        fleet.forEach((ship, i) => {
          const towardCenter = 0.34 - i * 0.12;
          const x = side === "l" ? w * towardCenter : w * (1 - towardCenter);
          const bob = Math.sin(t / 220 + i) * 2;
          const st = states[i];
          const now = t;
          if (st === "sunk") {
            if (!ship.sunkSince) ship.sunkSince = now;
          } else {
            ship.sunkSince = 0;
          }
          const sinkingFlame = st === "sunk" && now - ship.sunkSince < SUNK_FLAME_MS;
          ship.hull.texture = st === "sunk" && !sinkingFlame ? textures.wreck : textures.hull;
          ship.hull.tint = hexToNum(side === "l" ? p.colorA : p.colorB);
          ship.hull.alpha = st === "sunk" ? 0.92 : 1;
          ship.hull.rotation = st === "sunk" ? (side === "l" ? 0.18 : -0.18) : 0;
          ship.hull.position.set(x, waterY + bob + (st === "sunk" ? 10 : 0));
          ship.fire.texture = flameTex;
          ship.fire.visible = st === "fire" || sinkingFlame;
          const deck = ship.hull.height * 0.58;
          ship.fire.position.set(x + (side === "l" ? 6 : -6), waterY + bob - deck);
          ship.fire.scale.set(ship.size * (st === "sunk" ? 2.2 : 1.8));
        });
      };
      place(left, leftStates, "l");
      place(right, rightStates, "r");

      if (p.lastCorrectAt !== lastBurst && p.lastCorrect) {
        lastBurst = p.lastCorrectAt;
        const score = p.lastCorrect === "a" ? p.scoreA : p.scoreB;
        const stage = Math.min(6, Math.round((score / Math.max(1, p.winScore)) * 6));
        const idx = Math.min(2, Math.max(0, Math.floor((stage - 1) / 2)));
        const from = p.lastCorrect === "a" ? left[idx] : right[idx];
        const to = p.lastCorrect === "a" ? right[idx] : left[idx];
        shotFrom = { x: from.hull.x, y: from.hull.y - from.hull.height * 0.45 };
        shotTo = { x: to.hull.x, y: to.hull.y - to.hull.height * 0.45 };
        shotT = 0;
        shot.visible = true;
      }
      if (shotT < 1) {
        shotT = Math.min(1, shotT + 0.06);
        shot.x = shotFrom.x + (shotTo.x - shotFrom.x) * shotT;
        shot.y = shotFrom.y + (shotTo.y - shotFrom.y) * shotT - Math.sin(shotT * Math.PI) * 28;
        if (shotT >= 1) shot.visible = false;
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
