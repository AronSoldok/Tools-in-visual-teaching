"use client";

import { useGamesStore, type GameKind } from "@/store/gamesStore";

const GAMES: { id: GameKind; title: string; hint: string; art: string }[] = [
  { id: "tug", title: "Перетягивание каната", hint: "Кто быстрее считает — тот тянет канат на свою сторону.", art: "🪢" },
  { id: "race", title: "Гонки", hint: "Верный ответ двигает машинку вперёд к финишу.", art: "🏎️" },
  { id: "battle", title: "Морской бой", hint: "Попадания поджигают корабли, затем они тонут.", art: "🚢" },
];

export function GamePicker() {
  const selectGame = useGamesStore((s) => s.selectGame);

  return (
    <div className="games-picker">
      <header className="games-header">
        <h1 className="games-title">Игры</h1>
        <p className="games-lead">Выберите игру. Две команды решают примеры одновременно.</p>
      </header>
      <div className="games-picker-grid">
        {GAMES.map((game) => (
          <button
            key={game.id}
            type="button"
            className="games-pick-card"
            onClick={() => selectGame(game.id)}
          >
            <span className="games-pick-art" aria-hidden>
              {game.art}
            </span>
            <span className="games-pick-title">{game.title}</span>
            <span className="games-pick-hint">{game.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
