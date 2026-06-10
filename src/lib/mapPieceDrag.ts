export interface PieceTransform {
  x: number;
  y: number;
}

export interface ClientDelta {
  x: number;
  y: number;
}

const DEFAULT_SNAP_THRESHOLD_PX = 48;

export function applyDragDelta(
  origin: PieceTransform,
  clientDelta: ClientDelta,
  zoom: number,
): PieceTransform {
  const k = Math.max(0.5, zoom);
  return {
    x: origin.x + clientDelta.x / k,
    y: origin.y + clientDelta.y / k,
  };
}

export function screenDistanceFromOrigin(
  transform: PieceTransform,
  zoom: number,
): number {
  const k = Math.max(0.5, zoom);
  return k * Math.hypot(transform.x, transform.y);
}

export function shouldSnapToOrigin(
  transform: PieceTransform,
  zoom: number,
  thresholdPx = DEFAULT_SNAP_THRESHOLD_PX,
): boolean {
  return screenDistanceFromOrigin(transform, zoom) < thresholdPx;
}

export function snapTransform(
  transform: PieceTransform,
  zoom: number,
  thresholdPx = DEFAULT_SNAP_THRESHOLD_PX,
): PieceTransform {
  if (shouldSnapToOrigin(transform, zoom, thresholdPx)) {
    return { x: 0, y: 0 };
  }
  return transform;
}
