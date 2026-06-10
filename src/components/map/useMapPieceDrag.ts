"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  applyDragDelta,
  snapTransform,
  type PieceTransform,
} from "@/lib/mapPieceDrag";
import { useMapStore } from "@/store/mapStore";

export function useMapPieceDrag(id: string, mapZoom: number, enabled: boolean) {
  const pieceTransforms = useMapStore((s) => s.pieceTransforms);
  const setPieceTransform = useMapStore((s) => s.setPieceTransform);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    zoomAtStart: number;
    lastTransform: PieceTransform;
    captureTarget: Element | null;
    pointerId: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  const rawTransform = pieceTransforms[id];
  const transform = useMemo(
    () => rawTransform ?? { x: 0, y: 0 },
    [rawTransform],
  );
  const isDragged = transform.x !== 0 || transform.y !== 0;

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const next = applyDragDelta(
        { x: drag.originX, y: drag.originY },
        { x: e.clientX - drag.startX, y: e.clientY - drag.startY },
        drag.zoomAtStart,
      );
      drag.lastTransform = next;
      setPieceTransform(id, next);
    },
    [id, setPieceTransform],
  );

  const endDrag = useCallback(() => {
    const drag = dragRef.current;
    if (drag) {
      const snapped = snapTransform(drag.lastTransform, drag.zoomAtStart);
      setPieceTransform(id, snapped);
      if (
        drag.captureTarget &&
        drag.captureTarget.hasPointerCapture(drag.pointerId)
      ) {
        drag.captureTarget.releasePointerCapture(drag.pointerId);
      }
    }
    dragRef.current = null;
    setDragging(false);
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
  }, [handlePointerMove, id, setPieceTransform]);

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      e.stopPropagation();
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);

      const zoomAtStart = Math.max(0.5, mapZoom);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: transform.x,
        originY: transform.y,
        zoomAtStart,
        lastTransform: { ...transform },
        captureTarget: e.currentTarget,
        pointerId: e.pointerId,
      };
      setDragging(true);
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", endDrag);
      window.addEventListener("pointercancel", endDrag);
    },
    [enabled, mapZoom, transform, handlePointerMove, endDrag],
  );

  return {
    transform,
    isDragged,
    dragging,
    startDrag,
  };
}
