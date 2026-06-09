"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBoardStore } from "@/store/boardStore";

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
  opacity: number;
}

export function AnnotationLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const [textInput, setTextInput] = useState<{
    x: number;
    y: number;
    value: string;
  } | null>(null);

  const activeTool = useBoardStore((s) => s.activeTool);
  const textAnnotations = useBoardStore((s) => s.textAnnotations);
  const addTextAnnotation = useBoardStore((s) => s.addTextAnnotation);

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

  const getPoint = (e: React.PointerEvent): Point => {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (activeTool === "text") {
      const point = getPoint(e);
      setTextInput({ x: point.x, y: point.y, value: "" });
      return;
    }

    if (activeTool !== "pen" && activeTool !== "highlighter") return;

    e.currentTarget.setPointerCapture(e.pointerId);
    const point = getPoint(e);
    currentStrokeRef.current = {
      points: [point],
      color: activeTool === "pen" ? "#1e293b" : "#facc15",
      width: activeTool === "pen" ? 3 : 18,
      opacity: activeTool === "pen" ? 1 : 0.45,
    };
    redraw();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!currentStrokeRef.current) return;
    currentStrokeRef.current.points.push(getPoint(e));
    redraw();
  };

  const handlePointerUp = () => {
    if (currentStrokeRef.current) {
      strokesRef.current.push(currentStrokeRef.current);
      currentStrokeRef.current = null;
      redraw();
    }
  };

  const handleTextSubmit = () => {
    if (textInput && textInput.value.trim()) {
      addTextAnnotation(textInput.x, textInput.y, textInput.value.trim());
    }
    setTextInput(null);
  };

  const isDrawing = activeTool === "pen" || activeTool === "highlighter" || activeTool === "text";

  return (
    <div
      ref={containerRef}
      className={`annotation-layer ${isDrawing ? "active" : ""}`}
    >
      <canvas
        ref={canvasRef}
        className="annotation-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
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
        >
          <input
            autoFocus
            value={textInput.value}
            onChange={(e) =>
              setTextInput({ ...textInput, value: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTextSubmit();
              if (e.key === "Escape") setTextInput(null);
            }}
            onBlur={handleTextSubmit}
            placeholder="Введите текст..."
          />
        </div>
      )}
    </div>
  );
}

export function clearAnnotationCanvas() {
  window.dispatchEvent(new Event("clear-canvas"));
}
