"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAnnotationStore } from "@/store/annotationStore";
import {
  eraseStrokesAlongPath,
  eraseStrokesAtPoint,
  strokesChanged,
  type Stroke,
  type StrokePoint,
} from "@/lib/strokeErase";
import { useBoardStore } from "@/store/boardStore";

export function AnnotationLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const lastEraserPointRef = useRef<StrokePoint | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const [textInput, setTextInput] = useState<{
    x: number;
    y: number;
    value: string;
  } | null>(null);
  const [eraserCursor, setEraserCursor] = useState<{ x: number; y: number } | null>(null);

  const activeTool = useBoardStore((s) => s.activeTool);
  const penColor = useAnnotationStore((s) => s.penColor);
  const markerColor = useAnnotationStore((s) => s.markerColor);
  const eraserRadius = useAnnotationStore((s) => s.eraserRadius);
  const textAnnotations = useBoardStore((s) => s.textAnnotations);
  const addTextAnnotation = useBoardStore((s) => s.addTextAnnotation);
  const removeTextAnnotation = useBoardStore((s) => s.removeTextAnnotation);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = container.getBoundingClientRect();
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const drawStroke = (stroke: Stroke) => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.globalAlpha = stroke.opacity;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    strokesRef.current.forEach(drawStroke);
    if (currentStrokeRef.current) {
      drawStroke(currentStrokeRef.current);
    }
  }, []);

  useEffect(() => {
    redraw();
    const observer = new ResizeObserver(redraw);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [redraw]);

  useEffect(() => {
    const handler = () => {
      strokesRef.current = [];
      redraw();
    };
    window.addEventListener("clear-canvas", handler);
    return () => window.removeEventListener("clear-canvas", handler);
  }, [redraw]);

  const getPoint = (e: React.PointerEvent | PointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const eraseTextAt = (point: { x: number; y: number }) => {
    const container = containerRef.current;
    if (!container) return;
    const nodes = container.querySelectorAll<HTMLElement>(".text-annotation");
    nodes.forEach((el) => {
      const id = textAnnotations.find(
        (a) => Math.abs(a.x - parseFloat(el.style.left)) < 2 && Math.abs(a.y - parseFloat(el.style.top)) < 2,
      )?.id;
      if (!id) return;
      const rect = el.getBoundingClientRect();
      const cRect = container.getBoundingClientRect();
      const cx = rect.left + rect.width / 2 - cRect.left;
      const cy = rect.top + rect.height / 2 - cRect.top;
      if (Math.hypot(point.x - cx, point.y - cy) <= eraserRadius + rect.width / 4) {
        removeTextAnnotation(id);
      }
    });
  };

  const eraseAt = (point: StrokePoint) => {
    const before = strokesRef.current;
    strokesRef.current = eraseStrokesAtPoint(before, point, eraserRadius);
    if (strokesChanged(before, strokesRef.current)) {
      redraw();
    }
    eraseTextAt(point);
  };

  const eraseAlongPath = (from: StrokePoint, to: StrokePoint) => {
    const before = strokesRef.current;
    strokesRef.current = eraseStrokesAlongPath(before, from, to, eraserRadius);
    if (strokesChanged(before, strokesRef.current)) {
      redraw();
    }
    eraseTextAt(to);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (activeTool === "eraser") {
      e.currentTarget.setPointerCapture(e.pointerId);
      const point = getPoint(e);
      lastEraserPointRef.current = point;
      eraseAt(point);
      return;
    }

    if (activeTool === "text") {
      e.currentTarget.setPointerCapture(e.pointerId);
      const point = getPoint(e);
      setTextInput({ x: point.x, y: point.y, value: "" });
      return;
    }

    if (activeTool !== "pen" && activeTool !== "highlighter") return;

    e.currentTarget.setPointerCapture(e.pointerId);
    const point = getPoint(e);
    currentStrokeRef.current = {
      id: `stroke-${Date.now()}`,
      points: [point],
      color: activeTool === "pen" ? penColor : markerColor,
      width: activeTool === "pen" ? 3 : 18,
      opacity: activeTool === "pen" ? 1 : 0.45,
    };
    redraw();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activeTool === "eraser") {
      const point = getPoint(e);
      setEraserCursor(point);
      if (e.buttons === 0) {
        lastEraserPointRef.current = null;
        return;
      }
      const last = lastEraserPointRef.current;
      if (last) {
        eraseAlongPath(last, point);
      } else {
        eraseAt(point);
      }
      lastEraserPointRef.current = point;
      return;
    }
    if (!currentStrokeRef.current) return;
    currentStrokeRef.current.points.push(getPoint(e));
    redraw();
  };

  const handlePointerUp = () => {
    lastEraserPointRef.current = null;
    if (currentStrokeRef.current) {
      strokesRef.current.push(currentStrokeRef.current);
      currentStrokeRef.current = null;
      redraw();
    }
  };

  const handlePointerLeave = () => {
    setEraserCursor(null);
    handlePointerUp();
  };

  const handleTextSubmit = () => {
    if (textInput && textInput.value.trim()) {
      addTextAnnotation(textInput.x, textInput.y, textInput.value.trim());
    }
    setTextInput(null);
  };

  useEffect(() => {
    if (textInput) {
      requestAnimationFrame(() => textInputRef.current?.focus());
    }
  }, [textInput]);

  const isActive =
    activeTool === "pen" ||
    activeTool === "highlighter" ||
    activeTool === "text" ||
    activeTool === "eraser";

  return (
    <div
      ref={containerRef}
      className={`annotation-layer ${isActive ? "active tools-layer" : ""} ${activeTool === "eraser" ? "eraser-mode" : ""}`}
    >
      <canvas
        ref={canvasRef}
        className="annotation-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      />
      {activeTool === "eraser" && eraserCursor && (
        <div
          className="eraser-cursor"
          style={{
            left: eraserCursor.x,
            top: eraserCursor.y,
            width: eraserRadius * 2,
            height: eraserRadius * 2,
          }}
        />
      )}
      {textAnnotations.map((ann) => (
        <div
          key={ann.id}
          className="text-annotation"
          style={{ left: ann.x, top: ann.y }}
        >
          {ann.text}
        </div>
      ))}
      {textInput && (
        <div
          className="text-input-overlay"
          style={{ left: textInput.x, top: textInput.y }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <input
            ref={textInputRef}
            value={textInput.value}
            onChange={(e) =>
              setTextInput({ ...textInput, value: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleTextSubmit();
              }
              if (e.key === "Escape") setTextInput(null);
            }}
            placeholder="Введите текст..."
          />
          <button type="button" className="text-input-done" onClick={handleTextSubmit}>
            OK
          </button>
        </div>
      )}
    </div>
  );
}

export function clearAnnotationCanvas() {
  window.dispatchEvent(new Event("clear-canvas"));
}
