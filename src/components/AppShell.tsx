"use client";

import dynamic from "next/dynamic";
import { AppSidebar } from "./AppSidebar";
import { Board } from "./Board";
import { ClockApp } from "./clock/ClockApp";
import { GamesApp } from "./games/GamesApp";
import { useAppStore } from "@/store/appStore";

const MapApp = dynamic(() => import("./map/MapApp").then((m) => m.MapApp), {
  ssr: false,
  loading: () => <div className="map-loading">Загрузка карты…</div>,
});

export function AppShell() {
  const activeApp = useAppStore((s) => s.activeApp);

  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-content">
        {activeApp === "blocks" ? (
          <Board />
        ) : activeApp === "map" ? (
          <MapApp />
        ) : activeApp === "clock" ? (
          <ClockApp />
        ) : (
          <GamesApp />
        )}
      </div>
    </div>
  );
}
