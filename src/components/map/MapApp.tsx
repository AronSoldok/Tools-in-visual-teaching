"use client";

import dynamic from "next/dynamic";
import { MapToolbar } from "./MapToolbar";
import { FlatMapView } from "./FlatMapView";
import { MapAnnotationLayer } from "./MapAnnotationLayer";
import { useMapStore } from "@/store/mapStore";

const GlobeView = dynamic(
  () => import("./GlobeView").then((m) => m.GlobeView),
  { ssr: false, loading: () => <div className="map-loading">Загрузка глобуса…</div> },
);

export function MapApp() {
  const viewMode = useMapStore((s) => s.viewMode);

  return (
    <div className="map-app">
      <MapToolbar />
      <div className="map-viewport">
        {viewMode === "flat" ? <FlatMapView /> : <GlobeView />}
        <MapAnnotationLayer />
      </div>
    </div>
  );
}
