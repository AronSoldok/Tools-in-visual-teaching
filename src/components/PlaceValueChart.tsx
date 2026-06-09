"use client";

import { useEffect, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { BlockGroup } from "@/lib/boardModes";
import { DraggableBlock } from "./blocks/DraggableBlock";
import { COLUMN_LABELS, PLACE_COLUMNS } from "@/lib/blockTypes";
import { getColumnLayouts } from "@/lib/snap";
import { useBoardStore } from "@/store/boardStore";

interface PlaceValueChartProps {
  group?: BlockGroup;
  droppableId?: string;
  title?: string;
  chartClassName?: string;
}

export function PlaceValueChart({
  group = "main",
  droppableId = "place-value-chart",
  title = "Разряды",
  chartClassName = "",
}: PlaceValueChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const blocks = useBoardStore((s) => s.blocks);
  const chartWidth = useBoardStore((s) => s.chartWidth);
  const selectedBlockId = useBoardStore((s) => s.selectedBlockId);
  const setSelectedBlockId = useBoardStore((s) => s.setSelectedBlockId);
  const setChartSize = useBoardStore((s) => s.setChartSize);
  const activeTool = useBoardStore((s) => s.activeTool);

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { zone: "chart", group },
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
  }, [setChartSize, droppableId]);

  const layouts = getColumnLayouts(chartWidth);
  const chartBlocks = blocks.filter(
    (b) => b.group === group && b.column !== "free",
  );

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        chartRef.current = node;
      }}
      className={`place-value-chart ${chartClassName} ${isOver ? "drop-over" : ""}`}
      aria-label={`Таблица разрядов: ${title}`}
    >
      <h2 className="chart-title">{title}</h2>
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
            className={`chart-block-wrapper ${block.animating ? "regroup-animate" : ""} ${block.invalid ? "invalid-block" : ""}`}
            style={{ left: block.x, top: block.y, position: "absolute" }}
            title={block.invalid ? "Неверный разряд для этого блока" : undefined}
          >
            <DraggableBlock
              id={block.id}
              type={block.type}
              selected={selectedBlockId === block.id}
              invalid={block.invalid}
              onClick={() => setSelectedBlockId(block.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
