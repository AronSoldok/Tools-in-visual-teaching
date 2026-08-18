"use client";

import { Application, Assets, Texture, TextureStyle } from "pixi.js";
import { useEffect, useRef } from "react";

TextureStyle.defaultOptions.scaleMode = "nearest";

export type PixelSceneApi = {
  app: Application;
  textures: Record<string, Texture>;
};

type Props = {
  background: number;
  assets: Record<string, string>;
  setup: (api: PixelSceneApi) => void | (() => void);
};

export function PixelStage({ background, assets, setup }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const setupRef = useRef(setup);
  setupRef.current = setup;
  const assetKey = JSON.stringify(assets);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let app: Application | null = null;
    let sceneCleanup: void | (() => void);
    const assetMap = JSON.parse(assetKey) as Record<string, string>;

    const start = async () => {
      const instance = new Application();
      await instance.init({
        background,
        antialias: false,
        roundPixels: true,
        autoDensity: true,
        resolution: Math.min(2, window.devicePixelRatio || 1),
        resizeTo: host,
        preference: "webgl",
      });
      if (disposed) {
        instance.destroy(true);
        return;
      }
      app = instance;
      host.appendChild(instance.canvas);
      instance.canvas.style.display = "block";
      instance.canvas.style.width = "100%";
      instance.canvas.style.height = "100%";

      const textures: Record<string, Texture> = {};
      for (const [key, url] of Object.entries(assetMap)) {
        const texture = (await Assets.load(url)) as Texture;
        texture.source.scaleMode = "nearest";
        textures[key] = texture;
      }
      if (disposed) {
        instance.destroy(true);
        return;
      }
      sceneCleanup = setupRef.current({ app: instance, textures });
      if (disposed) {
        if (typeof sceneCleanup === "function") sceneCleanup();
        instance.destroy(true);
      }
    };

    void start();

    return () => {
      disposed = true;
      if (typeof sceneCleanup === "function") sceneCleanup();
      if (app) {
        app.destroy(true);
        app = null;
      }
      host.replaceChildren();
    };
  }, [background, assetKey]);

  return <div ref={hostRef} className="games-arena-stage" />;
}
