declare module "react-simple-maps" {
  import type { ComponentType, CSSProperties, ReactNode } from "react";

  export interface GeographyProps {
    geography: Record<string, unknown>;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: {
      default?: CSSProperties;
      hover?: CSSProperties;
      pressed?: CSSProperties;
    };
    onPointerDown?: (e: React.PointerEvent) => void;
  }

  export const ComposableMap: ComponentType<{
    width?: number;
    height?: number;
    projection?: string;
    projectionConfig?: Record<string, unknown>;
    className?: string;
    children?: ReactNode;
  }>;

  export const Geographies: ComponentType<{
    geography: unknown;
    children: (props: {
      geographies: Array<Record<string, unknown>>;
    }) => ReactNode;
  }>;

  export const Geography: ComponentType<GeographyProps>;

  export const Sphere: ComponentType<{
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  }>;

  export const Graticule: ComponentType<{
    stroke?: string;
    strokeWidth?: number;
  }>;

  export const Marker: ComponentType<{
    coordinates: [number, number];
    children?: ReactNode;
  }>;

  export const ZoomableGroup: ComponentType<{
    center?: [number, number];
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    filterZoomEvent?: (event: Event) => boolean;
    onMove?: (position: {
      x: number;
      y: number;
      zoom: number;
    }) => void;
    onMoveEnd?: (position: {
      coordinates: [number, number];
      zoom: number;
    }) => void;
    className?: string;
    children?: ReactNode;
  }>;
}

declare module "react-globe.gl" {
  import type { ComponentType, Ref } from "react";

  interface GlobeProps {
    ref?: Ref<unknown>;
    width?: number;
    height?: number;
    globeImageUrl?: string;
    bumpImageUrl?: string;
    globeCurvatureResolution?: number;
    backgroundColor?: string;
    atmosphereColor?: string;
    atmosphereAltitude?: number;
    enablePointerInteraction?: boolean;
    polygonsData?: unknown[];
    polygonGeoJsonGeometry?: string;
    polygonCapColor?: (d: unknown) => string;
    polygonSideColor?: (d: unknown) => string;
    polygonStrokeColor?: (d: unknown) => string;
    polygonAltitude?: number;
    polygonCapCurvatureResolution?: number;
    pathsData?: unknown[];
    pathPoints?: string;
    pathColor?: () => string;
    pathStroke?: number;
    pathPointAlt?: number;
    labelsData?: unknown[];
    labelLat?: string;
    labelLng?: string;
    labelText?: (d: { name: string }) => string;
    labelSize?: number;
    labelColor?: () => string;
    labelResolution?: number;
    labelAltitude?: number;
    labelIncludeDot?: boolean;
  }

  const Globe: ComponentType<GlobeProps>;
  export default Globe;
}

declare module "topojson-client" {
  import type { FeatureCollection, Geometry } from "geojson";
  import type { Topology, Objects } from "topojson-specification";

  export function feature(
    topology: Topology,
    object: Objects[keyof Objects],
  ): FeatureCollection<Geometry>;
}
