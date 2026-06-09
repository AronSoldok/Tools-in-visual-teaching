"use client";

import { CELL_SIZE } from "@/lib/blockTypes";
import { useBoardStore } from "@/store/boardStore";

const GRID_SIZE = 10;

export function DecimalGrid() {
  const gridCells = useBoardStore((s) => s.gridCells);
  const toggleGridCell = useBoardStore((s) => s.toggleGridCell);
  const boardMode = useBoardStore((s) => s.boardMode);
  const activeTool = useBoardStore((s) => s.activeTool);

  if (boardMode !== "decimal") return null;

  const cellSize = CELL_SIZE * 2.2;

  return (
    <div className="decimal-grid" aria-label="Сетка десятичных">
      <p className="decimal-grid-hint">
        Кликните по клеткам: 1 клетка = 0,01
      </p>
      <div
        className="decimal-grid-cells"
        style={{
          width: cellSize * GRID_SIZE,
          height: cellSize * GRID_SIZE,
        }}
      >
        {gridCells.map((row, rowIndex) =>
          row.map((filled, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              type="button"
              className={`decimal-cell ${filled ? "filled" : ""}`}
              style={{ width: cellSize, height: cellSize }}
              onClick={() => {
                if (activeTool === "select") {
                  toggleGridCell(rowIndex, colIndex);
                }
              }}
              aria-label={`Клетка ${rowIndex + 1},${colIndex + 1}`}
            />
          )),
        )}
      </div>
    </div>
  );
}
