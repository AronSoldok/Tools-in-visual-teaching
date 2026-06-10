"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import type { Feature, Geometry } from "geojson";
import {
  buildCountryBorderPaths,
  buildCountryLabels,
  darkenHex,
  getFeatureId,
  hashColor,
  loadCountries,
  POLITICAL_FILLS,
  withAlpha,
} from "@/lib/geoData";
import { useMapStore } from "@/store/mapStore";

export function GlobeView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<unknown>(null);
  const [size, setSize] = useState({ width: 800, height: 500 });
  const [countries, setCountries] = useState<Awaited<ReturnType<typeof loadCountries>> | null>(null);
  const mapStyle = useMapStore((s) => s.mapStyle);
  const activeTool = useMapStore((s) => s.activeTool);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    setSize({ width: el.clientWidth, height: el.clientHeight });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    loadCountries().then(setCountries).catch(() => setCountries(null));
  }, []);

  useEffect(() => {
    const globe = globeRef.current as {
      controls: () => { enabled: boolean };
    } | null;
    if (!globe?.controls) return;
    const controls = globe.controls();
    if (controls) controls.enabled = activeTool === "select";
  }, [activeTool]);

  const isPolitical = mapStyle === "political";
  const countryFeatures = isPolitical && countries ? countries.features : [];
  const borderPaths = useMemo(
    () => (isPolitical && countries ? buildCountryBorderPaths(countries) : []),
    [countries, isPolitical],
  );
  const labelPoints = useMemo(
    () => (countries ? buildCountryLabels(countries, 6, 100) : []),
    [countries],
  );

  const polygonCapColor = (d: unknown) => {
    const id = getFeatureId(d as Feature<Geometry>);
    return withAlpha(hashColor(id, POLITICAL_FILLS), 0.65);
  };

  const polygonSideColor = (d: unknown) => {
    const id = getFeatureId(d as Feature<Geometry>);
    return withAlpha(darkenHex(hashColor(id, POLITICAL_FILLS), 0.25), 0.75);
  };

  return (
    <div ref={containerRef} className="globe-view">
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        globeImageUrl="/geo/earth-topography.jpg"
        bumpImageUrl="/geo/earth-topography.jpg"
        globeCurvatureResolution={2}
        backgroundColor="rgba(0,0,0,0)"
        atmosphereColor={isPolitical ? "#a8c8e8" : "#88ccee"}
        atmosphereAltitude={0.15}
        enablePointerInteraction={activeTool === "select"}
        polygonsData={countryFeatures}
        polygonGeoJsonGeometry="geometry"
        polygonCapColor={polygonCapColor}
        polygonSideColor={polygonSideColor}
        polygonStrokeColor={() => "#0f172a"}
        polygonAltitude={0.025}
        polygonCapCurvatureResolution={3}
        pathsData={borderPaths}
        pathPoints="points"
        pathColor={() => "#1e293b"}
        pathStroke={0.35}
        pathPointAlt={0.026}
        labelsData={isPolitical ? labelPoints : []}
        labelLat="lat"
        labelLng="lng"
        labelText={(d: { name: string }) => d.name}
        labelSize={0.9}
        labelColor={() => "#f8fafc"}
        labelResolution={5}
        labelAltitude={0.03}
        labelIncludeDot={false}
      />
    </div>
  );
}
