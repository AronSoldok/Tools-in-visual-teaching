"use client";

import { Container, Graphics, Sprite } from "pixi.js";
import { useCallback, useRef } from "react";
import { PixelStage, type PixelSceneApi } from "./PixelStage";
import type { TeamId } from "@/store/gamesStore";

const ASSETS = {
  dinghy: "/games/battle/dinghy.png",
  sloop: "/games/battle/sloop.png",
  galleon: "/games/battle/galleon.png",
  fire1: "/games/battle/fire1.png",
  fire2: "/games/battle/fire2.png",
  boom: "/games/battle/boom.png",
  ball: "/games/battle/ball.png",
  water: "/games/battle/water.png",
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

export function BattleArena(props: Props) {
  const live = useRef(props);
  live.current = props;

  const setup = useCallback(({ app, textures }: PixelSceneApi) => {
    const world = new Container();
    app.stage.addChild(world);
    const water = new Graphics();
    world.addChild(water);

    const waterTiles: Sprite[] = [];
    const makeShip = (tex: (typeof textures)["sloop"], tint: number, left: boolean) => {
      const hull = new Sprite(tex);
      hull.anchor.set(0.5);
      hull.scale.set(0.9);
      hull.tint = tint;
      hull.rotation = left ? -Math.PI / 2 : Math.PI / 2;
      const fire = new Sprite(textures.fire1);
      fire.anchor.set(0.5, 1);
      fire.scale.set(2);
      fire.visible = false;
      const boom = new Sprite(textures.boom);
      boom.anchor.set(0.5);
      boom.scale.set(1.2);
      boom.visible = false;
      world.addChild(hull, fire, boom);
      return { hull, fire, boom };
    };

    const left = [
      makeShip(textures.dinghy, hexToNum(live.current.colorA), true),
      makeShip(textures.sloop, hexToNum(live.current.colorA), true),
      makeShip(textures.galleon, hexToNum(live.current.colorA), true),
    ];
    const right = [
      makeShip(textures.dinghy, hexToNum(live.current.colorB), false),
      makeShip(textures.sloop, hexToNum(live.current.colorB), false),
      makeShip(textures.galleon, hexToNum(live.current.colorB), false),
    ];

    const shot = new Sprite(textures.ball);
    shot.anchor.set(0.5);
    shot.scale.set(2);
    shot.visible = false;
    world.addChild(shot);
    let shotT = 1;
    let shotFrom = { x: 0, y: 0 };
    let shotTo = { x: 0, y: 0 };

    const layoutTiles = () => {
      const w = app.screen.width;
      const h = app.screen.height;
      water.clear().rect(0, 0, w, h).fill(0x38bdf8);
      const tw = textures.water.width * 2;
      const th = textures.water.height * 2;
      let n = 0;
      for (let y = 0; y < h + th; y += th) {
        for (let x = 0; x < w + tw; x += tw) {
          let tile = waterTiles[n];
          if (!tile) {
            tile = new Sprite(textures.water);
            tile.scale.set(2);
            tile.alpha = 0.55;
            world.addChildAt(tile, 1);
            waterTiles.push(tile);
          }
          tile.position.set(x, y);
          tile.visible = true;
          n += 1;
        }
      }
      for (let i = n; i < waterTiles.length; i++) waterTiles[i].visible = false;
    };

    layoutTiles();
    const onResize = () => layoutTiles();
    app.renderer.on("resize", onResize);

    let lastBurst = 0;
    const tick = () => {
      const p = live.current;
      const w = app.screen.width;
      const h = app.screen.height;
      const leftStates = [0, 1, 2].map((i) => shipState(p.scoreB, p.winScore, i));
      const rightStates = [0, 1, 2].map((i) => shipState(p.scoreA, p.winScore, i));

      const place = (fleet: typeof left, states: ShipState[], side: "l" | "r") => {
        fleet.forEach((ship, i) => {
          const x = side === "l" ? w * 0.18 : w * 0.82;
          const y = h * (0.22 + i * 0.28);
          const bob = Math.sin(app.ticker.lastTime / 220 + i) * 4;
          ship.hull.position.set(x, y + bob);
          ship.hull.tint = hexToNum(side === "l" ? p.colorA : p.colorB);
          const st = states[i];
          ship.fire.visible = st !== "ok";
          ship.fire.texture = Math.sin(app.ticker.lastTime / 80) > 0 ? textures.fire1 : textures.fire2;
          ship.fire.position.set(x, y + bob - 10);
          if (st === "sunk") {
            ship.hull.alpha = 0.35;
            ship.hull.rotation = (side === "l" ? -Math.PI / 2 : Math.PI / 2) + 0.45;
            ship.hull.y = y + 18;
            ship.boom.visible = true;
            ship.boom.position.set(x, y);
            ship.boom.alpha = 0.85;
          } else {
            ship.hull.alpha = 1;
            ship.hull.rotation = side === "l" ? -Math.PI / 2 : Math.PI / 2;
            ship.boom.visible = false;
          }
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
        shotFrom = { x: from.hull.x, y: from.hull.y };
        shotTo = { x: to.hull.x, y: to.hull.y };
        shotT = 0;
        shot.visible = true;
      }
      if (shotT < 1) {
        shotT = Math.min(1, shotT + 0.06);
        shot.x = shotFrom.x + (shotTo.x - shotFrom.x) * shotT;
        shot.y = shotFrom.y + (shotTo.y - shotFrom.y) * shotT - Math.sin(shotT * Math.PI) * 30;
        if (shotT >= 1) shot.visible = false;
      }
    };
    app.ticker.add(tick);

    return () => {
      app.ticker.remove(tick);
      app.renderer.off("resize", onResize);
    };
  }, []);

  return <PixelStage background={0x38bdf8} assets={ASSETS} setup={setup} />;
}
