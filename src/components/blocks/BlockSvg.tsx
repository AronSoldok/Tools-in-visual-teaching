"use client";

import type { ReactNode } from "react";
import { BLOCK_CONFIG, type BlockType } from "@/lib/blockTypes";

interface BlockSvgProps {
  type: BlockType;
  selected?: boolean;
  className?: string;
  partialFill?: number;
  partialShape?: BlockType;
  mini?: boolean;
}

function darken(hex: string, amount = 0.2): string {
  if (hex.startsWith("rgb")) return hex;
  const n = parseInt(hex.slice(1), 16);
  if (Number.isNaN(n)) return hex;
  const r = Math.max(0, Math.floor(((n >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.floor(((n >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.floor((n & 0xff) * (1 - amount)));
  return `rgb(${r},${g},${b})`;
}

/** Flat 2D square cell */
function Square2D({
  x,
  y,
  size,
  color,
  border,
  ghost,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  border: string;
  ghost?: boolean;
}) {
  const fill = ghost ? "rgba(210, 210, 210, 0.35)" : color;
  const stroke = ghost ? "#94a3b8" : border;

  return (
    <rect
      x={x}
      y={y}
      width={size}
      height={size}
      rx={2}
      fill={fill}
      stroke={stroke}
      strokeWidth={ghost ? 1 : 1.5}
      strokeDasharray={ghost ? "3 2" : undefined}
      className={`block-square ${ghost ? "block-partial-ghost" : ""}`}
    />
  );
}

type Pt = [number, number];

function gridPoint(origin: Pt, uCorner: Pt, vCorner: Pt, i: number, j: number, n: number): Pt {
  const t = i / n;
  const s = j / n;
  return [
    origin[0] + (uCorner[0] - origin[0]) * t + (vCorner[0] - origin[0]) * s,
    origin[1] + (uCorner[1] - origin[1]) * t + (vCorner[1] - origin[1]) * s,
  ];
}

function FaceGrid({
  origin,
  uCorner,
  vCorner,
  n,
  stroke,
  strokeWidth,
}: {
  origin: Pt;
  uCorner: Pt;
  vCorner: Pt;
  n: number;
  stroke: string;
  strokeWidth: number;
}) {
  const lines: ReactNode[] = [];
  for (let i = 0; i <= n; i++) {
    const a = gridPoint(origin, uCorner, vCorner, i, 0, n);
    const b = gridPoint(origin, uCorner, vCorner, i, n, n);
    lines.push(
      <line
        key={`u${i}`}
        x1={a[0]}
        y1={a[1]}
        x2={b[0]}
        y2={b[1]}
        stroke={stroke}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />,
    );
  }
  for (let j = 1; j < n; j++) {
    const a = gridPoint(origin, uCorner, vCorner, 0, j, n);
    const b = gridPoint(origin, uCorner, vCorner, n, j, n);
    lines.push(
      <line
        key={`v${j}`}
        x1={a[0]}
        y1={a[1]}
        x2={b[0]}
        y2={b[1]}
        stroke={stroke}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />,
    );
  }
  return <g pointerEvents="none">{lines}</g>;
}

function isoCorners(x: number, y: number, size: number) {
  const w = size;
  const h = size * 0.5;
  const cx = x + w / 2;
  const top: Pt = [cx, y];
  const right: Pt = [x + w, y + h * 0.5];
  const bottom: Pt = [cx, y + h];
  const left: Pt = [x, y + h * 0.5];
  const rightBottom: Pt = [x + w, y + h * 1.5];
  const bottomTip: Pt = [cx, y + h * 2];
  const leftBottom: Pt = [x, y + h * 1.5];
  return { top, right, bottom, left, rightBottom, bottomTip, leftBottom, w, h };
}

function IsoFaces({
  x,
  y,
  size,
  color,
  border,
  ghost,
  divisions = 10,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  border: string;
  ghost?: boolean;
  divisions?: number;
}) {
  const c = isoCorners(x, y, size);
  const fill = ghost ? "rgba(210, 210, 210, 0.35)" : color;
  const stroke = ghost ? "#94a3b8" : border;
  const sw = ghost ? 0.8 : 1.2;
  const gridStroke = ghost ? "#94a3b8" : darken(border, 0.08);
  const gridSw = ghost ? 0.35 : Math.max(0.4, size / 140);

  const leftPts = `${c.left} ${c.bottom} ${c.bottomTip} ${c.leftBottom}`;
  const rightPts = `${c.bottom} ${c.right} ${c.rightBottom} ${c.bottomTip}`;
  const topPts = `${c.top} ${c.right} ${c.bottom} ${c.left}`;

  return (
    <g className={ghost ? "block-partial-ghost" : ""}>
      <polygon points={leftPts} fill={darken(fill, ghost ? 0 : 0.28)} stroke={stroke} strokeWidth={sw} />
      <polygon points={rightPts} fill={darken(fill, ghost ? 0 : 0.14)} stroke={stroke} strokeWidth={sw} />
      <polygon points={topPts} fill={fill} stroke={stroke} strokeWidth={sw} />
      <FaceGrid
        origin={c.left}
        uCorner={c.bottom}
        vCorner={c.leftBottom}
        n={divisions}
        stroke={gridStroke}
        strokeWidth={gridSw}
      />
      <FaceGrid
        origin={c.bottom}
        uCorner={c.right}
        vCorner={c.bottomTip}
        n={divisions}
        stroke={gridStroke}
        strokeWidth={gridSw}
      />
      <FaceGrid
        origin={c.left}
        uCorner={c.top}
        vCorner={c.bottom}
        n={divisions}
        stroke={gridStroke}
        strokeWidth={gridSw}
      />
    </g>
  );
}

function SelectionRect({ width, height }: { width: number; height: number }) {
  return (
    <rect
      x={0}
      y={0}
      width={width}
      height={height}
      fill="none"
      stroke="var(--primary)"
      strokeWidth={2.5}
      strokeDasharray="6 4"
      rx={4}
    />
  );
}

function RodView({
  width,
  height,
  color,
  border,
  filled = 10,
  selected,
  mini,
}: {
  width: number;
  height: number;
  color: string;
  border: string;
  filled?: number;
  selected?: boolean;
  mini?: boolean;
}) {
  const gap = mini ? 0.5 : 1;
  const cell = (width - gap * 9) / 10;
  const offsetY = (height - cell) / 2;

  return (
    <g>
      {Array.from({ length: 10 }).map((_, i) => (
        <Square2D
          key={i}
          x={i * (cell + gap)}
          y={offsetY}
          size={cell}
          color={color}
          border={border}
          ghost={i >= filled}
        />
      ))}
      {selected && <SelectionRect width={width} height={height} />}
    </g>
  );
}

function FlatView({
  width,
  height,
  color,
  border,
  filledRows = 10,
  selected,
  mini,
}: {
  width: number;
  height: number;
  color: string;
  border: string;
  filledRows?: number;
  selected?: boolean;
  mini?: boolean;
}) {
  const gap = mini ? 0.3 : 0.5;
  const cell = (width - gap * 9) / 10;
  const gridH = cell * 10 + gap * 9;
  const offsetY = (height - gridH) / 2;

  return (
    <g>
      {Array.from({ length: 10 }).map((_, row) =>
        Array.from({ length: 10 }).map((_, col) => (
          <Square2D
            key={`${row}-${col}`}
            x={col * (cell + gap)}
            y={offsetY + row * (cell + gap)}
            size={cell}
            color={color}
            border={border}
            ghost={row >= filledRows}
          />
        )),
      )}
      {selected && <SelectionRect width={width} height={height} />}
    </g>
  );
}

function CubeStackView({
  width,
  height,
  color,
  border,
  filledLayers = 10,
  selected,
}: {
  width: number;
  height: number;
  color: string;
  border: string;
  filledLayers?: number;
  selected?: boolean;
}) {
  const layers = 10;
  const size = width * 0.72;
  const slabDepth = size;
  const gap = layers > 1 ? (height - slabDepth) / (layers - 1) : 0;

  return (
    <g>
      {Array.from({ length: layers }).map((_, layer) => {
        const y = height - slabDepth - layer * gap;
        const ghost = layer >= filledLayers;
        return (
          <IsoFaces
            key={layer}
            x={(width - size) / 2}
            y={y}
            size={size}
            color={color}
            border={border}
            ghost={ghost}
          />
        );
      })}
      {selected && <SelectionRect width={width} height={height} />}
    </g>
  );
}

function IsoCubeView({
  width,
  height,
  color,
  border,
  selected,
}: {
  width: number;
  height: number;
  color: string;
  border: string;
  selected?: boolean;
}) {
  const size = Math.min(width, height) * 0.92;
  const x = (width - size) / 2;
  const y = (height - size) / 2;

  return (
    <g>
      <IsoFaces x={x} y={y} size={size} color={color} border={border} />
      {selected && <SelectionRect width={width} height={height} />}
    </g>
  );
}

export function BlockSvg({
  type,
  selected,
  className,
  partialFill,
  partialShape,
  mini,
}: BlockSvgProps) {
  const config = BLOCK_CONFIG[type];
  const { width, height, color, border } = config;

  const displayW = mini ? 36 : width;
  const displayH = mini
    ? type === "unit"
      ? 24
      : type === "rod"
        ? 20
        : type === "flat"
          ? 36
          : 32
    : height;

  if (partialFill && partialShape) {
    const shapeConfig = BLOCK_CONFIG[partialShape];
    const pw = mini ? 36 : shapeConfig.width;
    const ph = mini
      ? partialShape === "unit"
        ? 24
        : partialShape === "rod"
          ? 20
          : partialShape === "flat"
            ? 36
            : 32
      : shapeConfig.height;
    const pc = BLOCK_CONFIG[type].color;
    const pb = BLOCK_CONFIG[type].border;

    return (
      <svg
        viewBox={`0 0 ${pw} ${ph}`}
        width={pw}
        height={ph}
        className={className}
        aria-label={`${partialFill} из 10`}
      >
        {partialShape === "rod" && (
          <RodView width={pw} height={ph} color={pc} border={pb} filled={partialFill} selected={selected} mini={mini} />
        )}
        {partialShape === "flat" && (
          <FlatView width={pw} height={ph} color={pc} border={pb} filledRows={partialFill} selected={selected} mini={mini} />
        )}
        {partialShape === "cube" && (
          <CubeStackView width={pw} height={ph} color={pc} border={pb} filledLayers={partialFill} selected={selected} />
        )}
      </svg>
    );
  }

  if (type === "unit") {
    const s = mini ? 22 : width;
    return (
      <svg viewBox={`0 0 ${s} ${s}`} width={s} height={s} className={className} aria-label={config.labelRu}>
        <Square2D x={0} y={0} size={s} color={color} border={border} />
        {selected && <SelectionRect width={s} height={s} />}
      </svg>
    );
  }

  if (type === "rod") {
    return (
      <svg viewBox={`0 0 ${displayW} ${displayH}`} width={displayW} height={displayH} className={className} aria-label={config.labelRu}>
        <RodView width={displayW} height={displayH} color={color} border={border} selected={selected} mini={mini} />
      </svg>
    );
  }

  if (type === "flat") {
    return (
      <svg viewBox={`0 0 ${displayW} ${displayH}`} width={displayW} height={displayH} className={className} aria-label={config.labelRu}>
        <FlatView width={displayW} height={displayH} color={color} border={border} selected={selected} mini={mini} />
      </svg>
    );
  }

  return (
    <svg viewBox={`0 0 ${displayW} ${displayH}`} width={displayW} height={displayH} className={className} aria-label={config.labelRu}>
      <IsoCubeView width={displayW} height={displayH} color={color} border={border} selected={selected} />
    </svg>
  );
}
