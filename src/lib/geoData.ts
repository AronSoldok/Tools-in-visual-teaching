import { geoCentroid } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";

export const WORLD_MAP_URL = "/geo/world-countries-50m.json";
export const CONTINENTS_URL = "/geo/continents-110m.json";

let worldTopoCache: Record<string, unknown> | null = null;
let countriesCache: FeatureCollection<Geometry> | null = null;
let continentsCache: FeatureCollection<Geometry> | null = null;

export const CONTINENT_LABELS: Record<string, string> = {
  africa: "Африка",
  antarctica: "Антарктида",
  asia: "Азия",
  europe: "Европа",
  north_america: "С. Америка",
  oceania: "Океания",
  south_america: "Ю. Америка",
};

export const CONTINENT_CENTERS: Record<string, [number, number]> = {
  north_america: [-100, 45],
  south_america: [-58, -22],
  europe: [15, 54],
  africa: [17, 2],
  asia: [95, 40],
  oceania: [145, -25],
  antarctica: [0, -75],
};

export const PHYSICAL_FILLS = ["#8fbc8f", "#a8c686", "#c4a574", "#7eb8da", "#9acd9a"];
export const POLITICAL_FILLS = [
  "#f4a261",
  "#e9c46a",
  "#2a9d8f",
  "#264653",
  "#e76f51",
  "#8ab17d",
  "#6d9ecf",
  "#c9ada7",
];

export function hashColor(id: string, palette: string[]): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function darkenHex(hex: string, amount: number): string {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * (1 - amount));
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * (1 - amount));
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * (1 - amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function getFeatureId(f: Feature<Geometry>): string {
  const props = f.properties as { name?: string } | null;
  return String(f.id ?? props?.name ?? "unknown");
}

export interface CountryBorderPath {
  points: { lat: number; lng: number }[];
}

export function buildCountryBorderPaths(
  countries: FeatureCollection<Geometry>,
): CountryBorderPath[] {
  const paths: CountryBorderPath[] = [];

  for (const f of countries.features) {
    if (f.geometry.type === "Polygon") {
      const ring = f.geometry.coordinates[0];
      if (!ring?.length) continue;
      paths.push({
        points: ring.map(([lng, lat]) => ({ lat, lng })),
      });
    } else if (f.geometry.type === "MultiPolygon") {
      for (const poly of f.geometry.coordinates) {
        const ring = poly[0];
        if (!ring?.length) continue;
        paths.push({
          points: ring.map(([lng, lat]) => ({ lat, lng })),
        });
      }
    }
  }

  return paths;
}

async function loadWorldTopo(): Promise<Record<string, unknown>> {
  if (worldTopoCache) return worldTopoCache;
  const res = await fetch(WORLD_MAP_URL);
  worldTopoCache = (await res.json()) as Record<string, unknown>;
  return worldTopoCache;
}

export async function loadCountries(): Promise<FeatureCollection<Geometry>> {
  if (countriesCache) return countriesCache;
  const worldTopo = await loadWorldTopo();
  const objects = worldTopo.objects as Record<string, unknown>;
  const obj = objects.countries ?? objects.land;
  if (!obj) throw new Error("No countries in topology");
  countriesCache = feature(
    worldTopo as unknown as Parameters<typeof feature>[0],
    obj as Parameters<typeof feature>[1],
  ) as FeatureCollection<Geometry>;
  return countriesCache;
}

export async function loadContinents(): Promise<FeatureCollection<Geometry>> {
  if (continentsCache) return continentsCache;
  const res = await fetch(CONTINENTS_URL);
  continentsCache = (await res.json()) as FeatureCollection<Geometry>;
  return continentsCache;
}

export interface CountryLabelPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  size: number;
}

/** Approximate polygon complexity as area proxy for label visibility. */
export function getFeatureArea(f: Feature<Geometry>): number {
  if (f.geometry.type === "Polygon") {
    return f.geometry.coordinates[0]?.length ?? 0;
  }
  if (f.geometry.type === "MultiPolygon") {
    return f.geometry.coordinates.reduce((sum, p) => sum + (p[0]?.length ?? 0), 0);
  }
  return 0;
}

export function buildCountryAreaMap(
  countries: FeatureCollection<Geometry>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const f of countries.features) {
    const id = String(f.id ?? (f.properties as { name?: string })?.name);
    map.set(id, getFeatureArea(f));
  }
  return map;
}

/** Minimum country area to show label at a given zoom level. */
export function getMinAreaForZoom(zoom: number): number {
  if (zoom <= 1.5) return 60;
  if (zoom <= 2.5) return 40;
  if (zoom <= 4) return 15;
  return 0;
}

export function shouldShowCountryLabel(area: number, zoom: number): boolean {
  return area >= getMinAreaForZoom(zoom);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Target label size on screen in px; grows with zoom. */
export function mapLabelTargetPx(mapZoom: number): number {
  const k = clamp(mapZoom, 0.5, 8);
  return clamp(7 + k * 1.4, 9, 18);
}

/** SVG font size in map units (inside ZoomableGroup scale k → screen ≈ fontSize * k). */
export function mapLabelFontSize(mapZoom: number): number {
  const k = clamp(mapZoom, 0.5, 8);
  return mapLabelTargetPx(k) / k;
}

export function mapLabelStrokeWidth(mapZoom: number): number {
  const k = clamp(mapZoom, 0.5, 8);
  const strokePx = clamp(2.5 + k * 0.15, 2.5, 4);
  return strokePx / k;
}

/** Major countries for globe / map labels (area threshold). */
export function buildCountryLabels(
  countries: FeatureCollection<Geometry>,
  minArea = 8,
  maxLabels = 100,
): CountryLabelPoint[] {
  return countries.features
    .map((f) => {
      const props = f.properties as { name?: string } | null;
      const name = props?.name ?? String(f.id);
      const id = getFeatureId(f);
      const [lng, lat] = geoCentroid(f);
      const area = getFeatureArea(f);
      return { id, name, lat, lng, size: area };
    })
    .filter((p) => p.size >= minArea)
    .sort((a, b) => b.size - a.size)
    .slice(0, maxLabels);
}
