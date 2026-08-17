"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { BlockSvg } from "./blocks/BlockSvg";
import {
  calculateTotal,
  compareLabel,
  compareValues,
  formatBreakdown,
  formatBreakdownEquation,
  formatNumber,
  getPlaceValueBreakdown,
  countBlocksByType,
  parseTargetNumber,
  TARGET_MAX,
  TARGET_MIN,
} from "@/lib/placeValue";
import { useBoardStore } from "@/store/boardStore";
import type { BlockType } from "@/lib/blockTypes";

const HINT_TYPES: { type: BlockType; key: keyof ReturnType<typeof getPlaceValueBreakdown> }[] = [
  { type: "cube", key: "thousands" },
  { type: "flat", key: "hundreds" },
  { type: "rod", key: "tens" },
  { type: "unit", key: "ones" },
];

export function NumberDisplay() {
  const blocks = useBoardStore((s) => s.blocks);
  const boardMode = useBoardStore((s) => s.boardMode);
  const gridCells = useBoardStore((s) => s.gridCells);
  const targetNumber = useBoardStore((s) => s.targetNumber);
  const feedback = useBoardStore((s) => s.feedback);
  const setTargetNumber = useBoardStore((s) => s.setTargetNumber);
  const clearTarget = useBoardStore((s) => s.clearTarget);

  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

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
  const hasTarget = boardMode === "whole" && targetNumber !== null;
  const plaqueValue = hasTarget ? targetNumber : displayTotal;
  const breakdown = getPlaceValueBreakdown(displayTotal, boardMode);
  const breakdownText = formatBreakdown(breakdown, boardMode);
  const showLiveChips = !hasTarget && breakdownText !== "0";

  const studentEquation =
    hasTarget && feedback?.correct
      ? formatBreakdownEquation(countBlocksByType(blocks), total, boardMode)
      : null;
  const hintBreakdown =
    hasTarget && feedback && !feedback.correct
      ? getPlaceValueBreakdown(targetNumber, boardMode)
      : null;

  const openMenu = (e: MouseEvent) => {
    if (boardMode !== "whole") return;
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  };

  const startEdit = () => {
    setMenu(null);
    setInputValue(targetNumber !== null ? String(targetNumber) : "");
    setInputError(false);
    setEditing(true);
  };

  const submitEdit = () => {
    const parsed = parseTargetNumber(inputValue);
    if (parsed === null) {
      setInputError(true);
      return;
    }
    setTargetNumber(parsed);
    setEditing(false);
    setInputError(false);
  };

  return (
    <div className="number-display" aria-live="polite">
      <div
        className={`number-plaque ${hasTarget ? "number-plaque-target" : ""}`}
        onContextMenu={openMenu}
        title={boardMode === "whole" ? "Правый клик: вписать или убрать число" : undefined}
      >
        <span className="number-label">{hasTarget ? "Собери" : "Число"}</span>
        <span className="number-value">{formatNumber(plaqueValue, boardMode)}</span>
      </div>
      {showLiveChips && (
        <div className="number-chips">
          {breakdownText.split(boardMode === "decimal" ? " + " : " ").map((chip) => (
            <span key={chip} className="number-chip">
              {chip}
            </span>
          ))}
        </div>
      )}
      {studentEquation && (
        <p className="challenge-equation challenge-equation-ok">{studentEquation}</p>
      )}
      {hintBreakdown && targetNumber !== null && (
        <div className="challenge-hint">
          <p className="challenge-hint-label">Как можно было собрать</p>
          <div className="challenge-hint-blocks">
            {HINT_TYPES.flatMap(({ type, key }) =>
              Array.from({ length: hintBreakdown[key] }, (_, i) => (
                <BlockSvg key={`${type}-${i}`} type={type} mini className="challenge-hint-block" />
              )),
            )}
          </div>
          <p className="challenge-equation">
            {formatBreakdownEquation(hintBreakdown, targetNumber, boardMode)}
          </p>
        </div>
      )}
      {menu && (
        <div
          ref={menuRef}
          className="number-context-menu"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
        >
          <button type="button" role="menuitem" onClick={startEdit}>
            Вписать число
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenu(null);
              clearTarget();
            }}
            disabled={targetNumber === null}
          >
            Убрать число
          </button>
        </div>
      )}
      {editing && (
        <div className="number-edit-overlay" onPointerDown={() => setEditing(false)}>
          <div
            className="text-input-overlay number-edit-dialog"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={inputValue}
              inputMode="numeric"
              aria-label="Число от 1 до 9999"
              placeholder={`${TARGET_MIN}–${TARGET_MAX}`}
              onChange={(e) => {
                setInputValue(e.target.value);
                setInputError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitEdit();
                }
                if (e.key === "Escape") setEditing(false);
              }}
            />
            <button type="button" className="text-input-done" onClick={submitEdit}>
              OK
            </button>
            {inputError && (
              <span className="number-edit-error">Введите целое число от {TARGET_MIN} до {TARGET_MAX}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
