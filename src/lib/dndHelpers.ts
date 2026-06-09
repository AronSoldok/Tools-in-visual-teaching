import type { DragEndEvent } from "@dnd-kit/core";
import { BLOCK_CONFIG, type BlockType } from "./blockTypes";
import { detectColumn } from "./snap";

export function getDropPosition(
  event: DragEndEvent,
  containerSelector: string,
  blockType: BlockType,
): { x: number; y: number } | null {
  const el = document.querySelector(containerSelector);
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  const { delta, activatorEvent } = event;
  const config = BLOCK_CONFIG[blockType];

  let clientX = 0;
  let clientY = 0;

  if (activatorEvent && "clientX" in activatorEvent) {
    clientX = (activatorEvent as MouseEvent).clientX;
    clientY = (activatorEvent as MouseEvent).clientY;
  } else if (
    activatorEvent &&
    "changedTouches" in activatorEvent &&
    (activatorEvent as TouchEvent).changedTouches[0]
  ) {
    clientX = (activatorEvent as TouchEvent).changedTouches[0].clientX;
    clientY = (activatorEvent as TouchEvent).changedTouches[0].clientY;
  } else {
    return null;
  }

  return {
    x: clientX + delta.x - rect.left - config.width / 2,
    y: clientY + delta.y - rect.top - config.height / 2,
  };
}

export function getChartDropInfo(
  event: DragEndEvent,
  chartSelector: string,
  chartWidth: number,
  blockType: BlockType,
) {
  const pos = getDropPosition(event, chartSelector, blockType);
  if (!pos) return null;
  const column = detectColumn(pos.x, chartWidth);
  return { ...pos, column };
}
