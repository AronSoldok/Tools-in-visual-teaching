"use client";

import { useEffect, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { BlockGroup } from "@/lib/boardModes";
import { DraggableBlock } from "./blocks/DraggableBlock";
import { BlockSvg } from "./blocks/BlockSvg";
import { COLUMN_LABELS, COLUMN_THEME, PLACE_COLUMNS } from "@/lib/blockTypes";
import {
  countBlocksForColumn,
  getWorkspaceBlocksForColumn,
} from "@/lib/placeValue";
import { getColumnLayouts } from "@/lib/snap";
import { useBoardStore } from "@/store/boardStore";

interface PlaceValueChartProps {
  group?: BlockGroup;
  droppableId?: string;
  title?: string;
  chartClassName?: string;
  comparisonMode?: boolean;
}

export function PlaceValueChart({
  group = "main",
  droppableId = "place-value-chart",
  title = "Разряды",
  chartClassName = "",
  comparisonMode = false,
}: PlaceValueChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const blocks = useBoardStore((s) => s.blocks);
  const boardMode = useBoardStore((s) => s.boardMode);
  const chartWidth = useBoardStore((s) => s.chartWidth);
  const selectedBlockIds = useBoardStore((s) => s.selectedBlockIds);
  const setChartSize = useBoardStore((s) => s.setChartSize);
  const activeTool = useBoardStore((s) => s.activeTool);

  const isComparison = comparisonMode || boardMode === "comparison";

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { zone: "chart", group },
    disabled: activeTool !== "select" || isComparison,
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
  const groupBlocks = blocks.filter((b) => b.group === group);
  const chartBlocks = isComparison
    ? []
    : groupBlocks.filter((b) => b.column !== "free");

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        chartRef.current = node;
      }}
      className={`place-value-chart ${chartClassName} ${isComparison ? "comparison-chart" : ""} ${isOver ? "drop-over" : ""}`}
      aria-label={`Таблица разрядов: ${title}`}
    >
      <h2 className="chart-title">{title}</h2>
      <div className="chart-grid">
        {PLACE_COLUMNS.map((column) => {
          const theme = COLUMN_THEME[column];
          const count = countBlocksForColumn(groupBlocks, column, boardMode);
          const miniBlocks = getWorkspaceBlocksForColumn(groupBlocks, column, boardMode);
          const readyCompose = !isComparison && count >= 10;
          return (
            <div
              key={column}
              className={`chart-column chart-column--${column} ${readyCompose ? "column-ready-compose" : ""}`}
              style={{
                backgroundColor: theme.bg,
                borderColor: theme.border,
              }}
            >
              <div className="column-header">
                <span className="column-label">{COLUMN_LABELS[column]}</span>
                <span className="column-counter">{count}</span>
              </div>
              {!isComparison && (
                <div className="column-type-icon" title={`Тип: ${theme.valueLabel}`}>
                  <BlockSvg type={theme.blockType} mini className="column-block-icon" />
                  <span className="column-value-label">{theme.valueLabel}</span>
                </div>
              )}
              {isComparison && miniBlocks.length > 0 && (
                <div className="column-miniatures">
                  {miniBlocks.map((block) => (
                    <BlockSvg
                      key={block.id}
                      type={block.type}
                      mini
                      partialFill={block.partialFill}
                      partialShape={block.partialShape}
                      className="column-miniature"
                    />
                  ))}
                </div>
              )}
              {!isComparison && <div className="column-drop-zone" data-column={column} />}
            </div>
          );
        })}
      </div>
      {!isComparison && (
        <div className="chart-blocks-layer">
          {chartBlocks.map((block) => {
            const layout = layouts.find((l) => l.column === block.column)!;
            return (
              <div
                key={block.id}
                className={`chart-block-wrapper ${block.animating ? "regroup-animate" : ""} ${block.invalid ? "invalid-block" : ""}`}
                style={{
                  left: block.x,
                  top: block.y,
                  position: "absolute",
                  width: layout.width,
                }}
                title={block.invalid ? "Неверный разряд для этого блока" : undefined}
              >
                <DraggableBlock
                  id={block.id}
                  type={block.type}
                  selected={selectedBlockIds.includes(block.id)}
                  invalid={block.invalid}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
