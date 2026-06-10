"use client";

import { Geography, Marker } from "react-simple-maps";
import { mapLabelFontSize, mapLabelStrokeWidth } from "@/lib/geoData";
import { useMapStore } from "@/store/mapStore";
import { useMapPieceDrag } from "./useMapPieceDrag";

export interface MapGeography {
  id?: string | number;
  properties?: Record<string, unknown>;
  rsmKey: string;
  svgPath: string;
  type: string;
  [key: string]: unknown;
}

function MapCountryLabel({
  label,
  mapZoom,
  className,
}: {
  label: string;
  mapZoom: number;
  className?: string;
}) {
  const fontSize = mapLabelFontSize(mapZoom);
  const strokeWidth = mapLabelStrokeWidth(mapZoom);

  return (
    <text
      textAnchor="middle"
      y={fontSize * 0.35}
      fontSize={fontSize}
      className={className}
      pointerEvents="none"
      stroke="rgba(255, 255, 255, 0.92)"
      strokeWidth={strokeWidth}
      paintOrder="stroke fill"
    >
      {label}
    </text>
  );
}

interface DraggableMapPieceProps {
  geo: MapGeography;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  label?: string;
  labelCoords?: [number, number];
  showLabel?: boolean;
  mapZoom?: number;
  isGhost?: boolean;
}

export function DraggableMapPiece({
  geo,
  fill,
  stroke = "#334155",
  strokeWidth = 0.6,
  label,
  labelCoords,
  showLabel = true,
  mapZoom = 1,
  isGhost = false,
}: DraggableMapPieceProps) {
  const id = String(geo.properties?.id ?? geo.id ?? geo.rsmKey);
  const activeTool = useMapStore((s) => s.activeTool);
  const { transform, isDragged, dragging, startDrag } = useMapPieceDrag(
    id,
    mapZoom,
    !isGhost && activeTool === "select",
  );

  if (isGhost) {
    if (!isDragged) return null;
    return (
      <g className="map-piece-ghost">
        <Geography
          geography={geo}
          fill="rgba(240, 240, 240, 0.55)"
          stroke="#94a3b8"
          strokeWidth={1.2}
          style={{
            default: {
              outline: "none",
              pointerEvents: "none",
              strokeDasharray: "4 3",
            },
            hover: { outline: "none" },
            pressed: { outline: "none" },
          }}
        />
      </g>
    );
  }

  if (!isDragged) return null;

  return (
    <g
      transform={`translate(${transform.x} ${transform.y})`}
      className={dragging ? "map-piece-dragging" : "map-piece-drag"}
      onPointerDown={startDrag}
    >
      <Geography
        geography={geo}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        style={{
          default: {
            outline: "none",
            cursor: activeTool === "select" ? "grab" : "default",
          },
          hover: { outline: "none", fill },
          pressed: { outline: "none" },
        }}
        onPointerDown={startDrag}
      />
      {showLabel && label && labelCoords && (
        <Marker coordinates={labelCoords}>
          <MapCountryLabel
            label={label}
            mapZoom={mapZoom}
            className="map-country-label map-piece-label"
          />
        </Marker>
      )}
    </g>
  );
}

interface StaticMapPieceProps {
  geo: MapGeography;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  label?: string;
  labelCoords?: [number, number];
  showLabel?: boolean;
  mapZoom?: number;
  oceanFill: string;
  draggable?: boolean;
}

export function StaticMapPiece({
  geo,
  fill,
  stroke = "#334155",
  strokeWidth = 0.6,
  label,
  labelCoords,
  showLabel = true,
  mapZoom = 1,
  oceanFill,
  draggable = true,
}: StaticMapPieceProps) {
  const id = String(geo.properties?.id ?? geo.id ?? geo.rsmKey);
  const isPieceDragged = useMapStore((s) => s.isPieceDragged(id));
  const { dragging, startDrag } = useMapPieceDrag(id, mapZoom, draggable);

  return (
    <g className={dragging ? "map-piece-dragging" : ""}>
      <Geography
        geography={geo}
        fill={isPieceDragged ? oceanFill : fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        style={{
          default: {
            outline: "none",
            cursor: draggable ? "grab" : "default",
          },
          hover: {
            outline: "none",
            fill: isPieceDragged ? oceanFill : fill,
            opacity: 0.9,
          },
          pressed: { outline: "none" },
        }}
        onPointerDown={startDrag}
      />
      {showLabel && !isPieceDragged && label && labelCoords && (
        <Marker coordinates={labelCoords}>
          <MapCountryLabel
            label={label}
            mapZoom={mapZoom}
            className="map-country-label"
          />
        </Marker>
      )}
    </g>
  );
}
