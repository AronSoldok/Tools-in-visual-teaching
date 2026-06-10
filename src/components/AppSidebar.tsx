"use client";

import { useAppStore, type ActiveApp } from "@/store/appStore";

const APPS: { id: ActiveApp; label: string; icon: string }[] = [
  { id: "blocks", label: "Блоки", icon: "▦" },
  { id: "map", label: "Карта", icon: "🌍" },
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
          title={app.id === "map" ? "Глобус и карта" : "Блоки"}
          aria-pressed={activeApp === app.id}
        >
          <span className="app-sidebar-icon">{app.icon}</span>
          <span className="app-sidebar-label">{app.label}</span>
        </button>
      ))}
    </nav>
  );
}
