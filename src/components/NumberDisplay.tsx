"use client";

import { calculateTotal, formatNumber } from "@/lib/placeValue";
import { useBoardStore } from "@/store/boardStore";

export function NumberDisplay() {
  const blocks = useBoardStore((s) => s.blocks);
  const total = calculateTotal(blocks);

  return (
    <div className="number-display" aria-live="polite">
      <span className="number-label">Число:</span>
      <span className="number-value">{formatNumber(total)}</span>
    </div>
  );
}
