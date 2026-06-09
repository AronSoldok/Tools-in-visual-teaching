"use client";

import { useEffect, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { DraggableBlock } from "./blocks/DraggableBlock";
import { COLUMN_LABELS, PLACE_COLUMNS } from "@/lib/blockTypes";
import { getColumnLayouts } from "@/lib/snap";
import { useBoardStore } from "@/store/boardStore";

export function PlaceValueChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const blocks = useBoardStore((s) => s.blocks);
  const chartWidth = useBoardStore((s) => s.chartWidth);
  const selectedBlockId = useBoardStore((s) => s.selectedBlockId);
  const setSelectedBlockId = useBoardStore((s) => s.setSelectedBlockId);
  const setChartSize = useBoardStore((s) => s.setChartSize);
  const activeTool = useBoardStore((s) => s.activeTool);

  const { setNodeRef, isOver } = useDroppable({
    id: "place-value-chart",
    data: { zone: "chart" },
    disabled: activeTool !== "select",
  });

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setChartSize(entry.contentRect.width, entry.contentRect.height);
      }
    });

    observer.observe(el);
    setChartSize(el.clientWidth, el.clientHeight);

    return () => observer.disconnect();
  }, [setChartSize]);

  const layouts = getColumnLayouts(chartWidth);
  const chartBlocks = blocks.filter((b) => b.column !== "free");

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        chartRef.current = node;
      }}
      className={`place-value-chart ${isOver ? "drop-over" : ""}`}
      aria-label="Таблица разрядов"
    >
      <h2 className="chart-title">Разряды</h2>
      <div className="chart-columns">
        {PLACE_COLUMNS.map((column) => {
          const layout = layouts.find((l) => l.column === column)!;
          return (
            <div
              key={column}
              className="chart-column"
              style={{ left: layout.x, width: layout.width }}
            >
              <span className="column-label">{COLUMN_LABELS[column]}</span>
              <div className="column-drop-zone" />
            </div>
          );
        })}
      </div>
      <div className="chart-blocks-layer">
        {chartBlocks.map((block) => (
          <div
            key={block.id}
            className={`chart-block-wrapper ${block.animating ? "regroup-animate" : ""}`}
            style={{ left: block.x, top: block.y, position: "absolute" }}
          >
            <DraggableBlock
              id={block.id}
              type={block.type}
              selected={selectedBlockId === block.id}
              onClick={() => setSelectedBlockId(block.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
