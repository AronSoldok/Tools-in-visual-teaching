"use client";

import {
  calculateTotal,
  compareLabel,
  compareValues,
  formatBreakdown,
  formatNumber,
  getPlaceValueBreakdown,
} from "@/lib/placeValue";
import { useBoardStore } from "@/store/boardStore";

export function NumberDisplay() {
  const blocks = useBoardStore((s) => s.blocks);
  const boardMode = useBoardStore((s) => s.boardMode);
  const gridCells = useBoardStore((s) => s.gridCells);

  if (boardMode === "comparison") {
    const blocksA = blocks.filter((b) => b.group === "a");
    const blocksB = blocks.filter((b) => b.group === "b");
    const totalA = calculateTotal(blocksA, boardMode);
    const totalB = calculateTotal(blocksB, boardMode);
    const result = compareValues(totalA, totalB);

    return (
      <div className="number-display comparison-display" aria-live="polite">
        <div className="number-plaque comparison-value">
          <span className="number-label">A</span>
          <span className="number-value">{formatNumber(totalA, boardMode)}</span>
        </div>
        <span className={`comparison-operator result-${result}`}>
          {compareLabel(result)}
        </span>
        <div className="number-plaque comparison-value">
          <span className="number-label">B</span>
          <span className="number-value">{formatNumber(totalB, boardMode)}</span>
        </div>
      </div>
    );
  }

  const total = calculateTotal(blocks, boardMode);
  const gridFilled = gridCells.flat().filter(Boolean).length;
  const gridValue = gridFilled * 0.01;
  const displayTotal = boardMode === "decimal" ? total + gridValue : total;
  const breakdown = getPlaceValueBreakdown(displayTotal, boardMode);
  const breakdownText = formatBreakdown(breakdown, boardMode);

  return (
    <div className="number-display" aria-live="polite">
      <div className="number-plaque">
        <span className="number-label">Число</span>
        <span className="number-value">{formatNumber(displayTotal, boardMode)}</span>
      </div>
      {breakdownText !== "0" && (
        <div className="number-chips">
          {breakdownText.split(boardMode === "decimal" ? " + " : " ").map((chip) => (
            <span key={chip} className="number-chip">
              {chip}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
