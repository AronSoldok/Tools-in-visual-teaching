export interface StrokePoint {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  points: StrokePoint[];
  color: string;
  width: number;
  opacity: number;
}

function distanceToSegment(p: StrokePoint, a: StrokePoint, b: StrokePoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function segmentErased(
  a: StrokePoint,
  b: StrokePoint,
  point: StrokePoint,
  radius: number,
): boolean {
  return distanceToSegment(point, a, b) <= radius;
}

/** Split stroke into remaining polylines, removing segments touched by eraser. */
export function eraseStrokeSegments(
  stroke: Stroke,
  point: StrokePoint,
  radius: number,
): Stroke[] {
  if (stroke.points.length < 2) {
    if (
      stroke.points.length === 1 &&
      Math.hypot(stroke.points[0].x - point.x, stroke.points[0].y - point.y) <= radius
    ) {
      return [];
    }
    return [stroke];
  }

  const result: Stroke[] = [];
  let current: StrokePoint[] = [];

  const flush = () => {
    if (current.length >= 2) {
      result.push({ ...stroke, id: `${stroke.id}-${result.length}`, points: [...current] });
    }
    current = [];
  };

  for (let i = 1; i < stroke.points.length; i++) {
    const a = stroke.points[i - 1];
    const b = stroke.points[i];
    const erased = segmentErased(a, b, point, radius + stroke.width / 2);

    if (erased) {
      if (current.length === 0) {
        current.push(a);
      }
      flush();
    } else {
      if (current.length === 0) {
        current.push(a);
      }
      current.push(b);
    }
  }

  flush();
  return result;
}

export function eraseStrokesAtPoint(
  strokes: Stroke[],
  point: StrokePoint,
  radius: number,
): Stroke[] {
  const next: Stroke[] = [];
  for (const stroke of strokes) {
    next.push(...eraseStrokeSegments(stroke, point, radius));
  }
  return next;
}

export function samplePointsAlongPath(
  from: StrokePoint,
  to: StrokePoint,
  step: number,
): StrokePoint[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return [to];

  const points: StrokePoint[] = [];
  const steps = Math.max(1, Math.ceil(dist / step));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({ x: from.x + dx * t, y: from.y + dy * t });
  }
  return points;
}

export function eraseStrokesAlongPath(
  strokes: Stroke[],
  from: StrokePoint,
  to: StrokePoint,
  radius: number,
  step = radius / 2,
): Stroke[] {
  let next = strokes;
  for (const point of samplePointsAlongPath(from, to, step)) {
    next = eraseStrokesAtPoint(next, point, radius);
  }
  return next;
}

export function strokesChanged(before: Stroke[], after: Stroke[]): boolean {
  if (before.length !== after.length) return true;
  for (let i = 0; i < before.length; i++) {
    const a = before[i];
    const b = after[i];
    if (a.points.length !== b.points.length) return true;
    for (let j = 0; j < a.points.length; j++) {
      if (a.points[j].x !== b.points[j].x || a.points[j].y !== b.points[j].y) {
        return true;
      }
    }
  }
  return false;
}
