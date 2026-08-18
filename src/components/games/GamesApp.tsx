"use client";

import { useGamesStore } from "@/store/gamesStore";
import { GamePicker } from "./GamePicker";
import { GamePlay } from "./GamePlay";
import { GameSetup } from "./GameSetup";
import { GameWinOverlay } from "./GameWinOverlay";

export function GamesApp() {
  const screen = useGamesStore((s) => s.screen);

  return (
    <div className="games-app">
      {screen === "pick" && <GamePicker />}
      {screen === "setup" && <GameSetup />}
      {screen === "play" && <GamePlay />}
      <GameWinOverlay />
    </div>
  );
}
