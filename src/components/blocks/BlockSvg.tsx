"use client";

import { BLOCK_CONFIG, type BlockType } from "@/lib/blockTypes";

interface BlockSvgProps {
  type: BlockType;
  selected?: boolean;
  className?: string;
}

export function BlockSvg({ type, selected, className }: BlockSvgProps) {
  const config = BLOCK_CONFIG[type];
  const { width, height, color, border } = config;

  if (type === "cube") {
    return (
      <svg
        viewBox="0 0 260 220"
        width={width}
        height={height * 0.85}
        className={className}
        aria-label={config.labelRu}
      >
        <polygon
          points="130,10 240,70 130,130 20,70"
          fill={color}
          stroke={border}
          strokeWidth="3"
        />
        <polygon
          points="130,130 240,70 240,160 130,220"
          fill={color}
          stroke={border}
          strokeWidth="3"
          opacity="0.85"
        />
        <polygon
          points="130,130 20,70 20,160 130,220"
          fill={color}
          stroke={border}
          strokeWidth="3"
          opacity="0.7"
        />
        {selected && (
          <rect
            x="10"
            y="5"
            width="240"
            height="215"
            fill="none"
            stroke="#2563eb"
            strokeWidth="3"
            strokeDasharray="6 4"
            rx="4"
          />
        )}
      </svg>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      aria-label={config.labelRu}
    >
      <rect
        x="1"
        y="1"
        width={width - 2}
        height={height - 2}
        fill={color}
        stroke={border}
        strokeWidth="2"
        rx={type === "unit" ? 3 : 2}
      />
      {type === "flat" &&
        Array.from({ length: 9 }).map((_, i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          return (
            <line
              key={i}
              x1={(col + 1) * (width / 10)}
              y1={(row + 1) * (height / 10)}
              x2={(col + 2) * (width / 10)}
              y2={(row + 1) * (height / 10)}
              stroke={border}
              strokeWidth="1"
              opacity="0.4"
            />
          );
        })}
      {type === "rod" &&
        Array.from({ length: 9 }).map((_, i) => (
          <line
            key={i}
            x1={(i + 1) * (width / 10)}
            y1="2"
            x2={(i + 1) * (width / 10)}
            y2={height - 2}
            stroke={border}
            strokeWidth="1"
            opacity="0.35"
          />
        ))}
      {selected && (
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="none"
          stroke="#2563eb"
          strokeWidth="3"
          strokeDasharray="6 4"
          rx="4"
        />
      )}
    </svg>
  );
}
