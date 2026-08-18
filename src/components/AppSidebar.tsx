"use client";

import { useAppStore, type ActiveApp } from "@/store/appStore";

const APPS: { id: ActiveApp; label: string; icon: string; title: string }[] = [
  { id: "blocks", label: "Блоки", icon: "▦", title: "Блоки" },
  { id: "map", label: "Карта", icon: "🌍", title: "Глобус и карта" },
  { id: "clock", label: "Часы", icon: "🕒", title: "Интерактивные часы" },
  { id: "games", label: "Игры", icon: "🎮", title: "Математические игры" },
];

export function AppSidebar() {
  const activeApp = useAppStore((s) => s.activeApp);
  const setActiveApp = useAppStore((s) => s.setActiveApp);

  return (
    <nav className="app-sidebar" aria-label="Инструменты">
      {APPS.map((app) => (
        <button
          key={app.id}
          type="button"
          className={`app-sidebar-btn ${activeApp === app.id ? "active" : ""}`}
          onClick={() => setActiveApp(app.id)}
          title={app.title}
          aria-pressed={activeApp === app.id}
        >
          <span className="app-sidebar-icon">{app.icon}</span>
          <span className="app-sidebar-label">{app.label}</span>
        </button>
      ))}
    </nav>
  );
}
