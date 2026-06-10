"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Graticule,
  Sphere,
  ZoomableGroup,
} from "react-simple-maps";
import { geoCentroid } from "d3-geo";
import {
  CONTINENT_CENTERS,
  CONTINENT_LABELS,
  PHYSICAL_FILLS,
  POLITICAL_FILLS,
  buildCountryAreaMap,
  hashColor,
  loadContinents,
  loadCountries,
  shouldShowCountryLabel,
} from "@/lib/geoData";
import { useMapStore } from "@/store/mapStore";
import {
  DraggableMapPiece,
  StaticMapPiece,
  type MapGeography,
} from "./DraggableMapPiece";

export function FlatMapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 500 });
  const [countries, setCountries] = useState<Awaited<ReturnType<typeof loadCountries>> | null>(null);
  const [continents, setContinents] = useState<Awaited<ReturnType<typeof loadContinents>> | null>(null);
  const mapStyle = useMapStore((s) => s.mapStyle);
  const activeTool = useMapStore((s) => s.activeTool);
  const zoom = useMapStore((s) => s.zoom);
  const center = useMapStore((s) => s.center);
  const setZoom = useMapStore((s) => s.setZoom);
  const setCenter = useMapStore((s) => s.setCenter);
  const [liveZoom, setLiveZoom] = useState(zoom);

  useEffect(() => {
    setLiveZoom(zoom);
  }, [zoom]);

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
    loadContinents().then(setContinents).catch(() => setContinents(null));
  }, []);

  const palette = mapStyle === "physical" ? PHYSICAL_FILLS : POLITICAL_FILLS;
  const oceanFill = mapStyle === "physical" ? "#b8d4e8" : "#dce8f4";
  const isPolitical = mapStyle === "political";
  const strokeWidth = isPolitical ? 0.8 : 0.4;
  const strokeColor = isPolitical ? "#334155" : "#ffffff";

  const labelById = useMemo(() => {
    const map = new Map<string, { name: string; coords: [number, number] }>();
    if (isPolitical && countries) {
      for (const f of countries.features) {
        const id = String(f.id ?? (f.properties as { name?: string })?.name);
        const name = (f.properties as { name?: string })?.name ?? id;
        try {
          const [lng, lat] = geoCentroid(f);
          map.set(id, { name, coords: [lng, lat] });
        } catch {
          /* skip */
        }
      }
    }
    return map;
  }, [countries, isPolitical]);

  const countryAreaById = useMemo(
    () => (countries ? buildCountryAreaMap(countries) : new Map<string, number>()),
    [countries],
  );

  const activeGeography = isPolitical ? countries : continents;

  const handleMove = useCallback((position: { zoom: number }) => {
    setLiveZoom(position.zoom);
  }, []);

  const handleMoveEnd = useCallback(
    (position: { coordinates: [number, number]; zoom: number }) => {
      setCenter(position.coordinates);
      setZoom(position.zoom);
      setLiveZoom(position.zoom);
    },
    [setCenter, setZoom],
  );

  const filterZoomEvent = useCallback(
    (e: Event) => {
      if (activeTool !== "select") return false;
      const ev = e as WheelEvent & { ctrlKey?: boolean; button?: number };
      return ev ? !ev.ctrlKey && !ev.button : false;
    },
    [activeTool],
  );

  const getLabelInfo = (geo: MapGeography, id: string) => {
    let label: string | undefined;
    let labelCoords: [number, number] | undefined;

    if (isPolitical) {
      const info = labelById.get(id);
      label = info?.name;
      labelCoords = info?.coords;
    } else {
      label = CONTINENT_LABELS[id] ?? id;
      labelCoords = CONTINENT_CENTERS[id];
      if (!labelCoords) {
        try {
          labelCoords = geoCentroid(geo as never) as [number, number];
        } catch {
          labelCoords = [0, 0];
        }
      }
    }

    return { label, labelCoords };
  };

  const shouldShowLabel = (id: string, label: string | undefined, forDrag = false) => {
    if (!label) return false;
    if (forDrag) return true;
    if (!isPolitical) return true;
    const area = countryAreaById.get(id) ?? 0;
    return shouldShowCountryLabel(area, liveZoom);
  };

  const renderPiece = (geo: MapGeography, mode: "base" | "ghost" | "drag") => {
    const id = String(geo.properties?.id ?? geo.id ?? geo.rsmKey);
    const fill = isPolitical
      ? hashColor(id, palette)
      : hashColor(id, PHYSICAL_FILLS);
    const { label, labelCoords } = getLabelInfo(geo, id);

    if (mode === "ghost") {
      return (
        <DraggableMapPiece
          key={`ghost-${id}`}
          geo={geo}
          fill={fill}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          label={label}
          labelCoords={labelCoords}
          showLabel={false}
          mapZoom={liveZoom}
          isGhost
        />
      );
    }

    if (mode === "drag") {
      return (
        <DraggableMapPiece
          key={`drag-${id}`}
          geo={geo}
          fill={fill}
          stroke={strokeColor}
          strokeWidth={strokeWidth + 0.3}
          label={label}
          labelCoords={labelCoords}
          showLabel={shouldShowLabel(id, label, true)}
          mapZoom={liveZoom}
        />
      );
    }

    return (
      <StaticMapPiece
        key={`base-${id}`}
        geo={geo}
        fill={fill}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        label={label}
        labelCoords={labelCoords}
        showLabel={shouldShowLabel(id, label) && activeTool === "select"}
        mapZoom={liveZoom}
        oceanFill={oceanFill}
        draggable={activeTool === "select"}
      />
    );
  };

  const mapContent = (
    <>
      <Sphere fill={oceanFill} stroke="#94a3b8" strokeWidth={0.5} />
      <Graticule stroke="#cbd5e1" strokeWidth={0.3} />

      {activeGeography && activeTool === "select" && (
        <Geographies geography={activeGeography}>
          {({ geographies }) =>
            geographies.map((geo) => renderPiece(geo as MapGeography, "base"))
          }
        </Geographies>
      )}

      {activeGeography && activeTool !== "select" && (
        <Geographies geography={activeGeography}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const g = geo as MapGeography;
              const id = String(g.properties?.id ?? g.id ?? g.rsmKey);
              const fill = hashColor(id, palette);
              const { label, labelCoords } = getLabelInfo(g, id);
              return (
                <StaticMapPiece
                  key={id}
                  geo={g}
                  fill={fill}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  label={label}
                  labelCoords={labelCoords}
                  showLabel={shouldShowLabel(id, label)}
                  mapZoom={liveZoom}
                  oceanFill={oceanFill}
                  draggable={false}
                />
              );
            })
          }
        </Geographies>
      )}

      {activeGeography && activeTool === "select" && (
        <Geographies geography={activeGeography}>
          {({ geographies }) =>
            geographies.map((geo) => renderPiece(geo as MapGeography, "ghost"))
          }
        </Geographies>
      )}

      {activeGeography && activeTool === "select" && (
        <Geographies geography={activeGeography}>
          {({ geographies }) =>
            geographies.map((geo) => renderPiece(geo as MapGeography, "drag"))
          }
        </Geographies>
      )}
    </>
  );

  return (
    <div
      ref={containerRef}
      className={`flat-map-view ${activeTool !== "select" ? "drawing-mode" : ""}`}
      style={{ "--map-zoom": liveZoom } as React.CSSProperties}
    >
      <ComposableMap
        width={size.width}
        height={size.height}
        projection="geoEqualEarth"
        className="flat-map-svg"
      >
        {activeTool === "select" ? (
          <ZoomableGroup
            center={center}
            zoom={zoom}
            minZoom={0.5}
            maxZoom={8}
            onMove={handleMove}
            onMoveEnd={handleMoveEnd}
            filterZoomEvent={filterZoomEvent}
          >
            {mapContent}
          </ZoomableGroup>
        ) : (
          mapContent
        )}
      </ComposableMap>
    </div>
  );
}
