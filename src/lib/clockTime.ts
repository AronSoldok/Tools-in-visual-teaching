export type ClockFormat = "12" | "24";

export interface ClockTime {
  hours: number;
  minutes: number;
}

export function analogHour(hours: number): number {
  return ((hours % 12) + 12) % 12;
}

export function hourAngle(hours: number, minutes: number): number {
  return analogHour(hours) * 30 + minutes * 0.5;
}

export function minuteAngle(minutes: number): number {
  return (minutes % 60) * 6;
}

export function displayHour(hours: number, format: ClockFormat): number {
  if (format === "24") return hours;
  const analog = analogHour(hours);
  return analog === 0 ? 12 : analog;
}

export function formatDigital(hours: number, minutes: number, format: ClockFormat): string {
  const mm = String(minutes).padStart(2, "0");
  if (format === "24") {
    return `${String(hours).padStart(2, "0")}:${mm}`;
  }
  return `${displayHour(hours, "12")}:${mm}`;
}

export function apply12hHour(hour1to12: number, currentHours: number): number {
  const analog = hour1to12 % 12;
  return currentHours >= 12 ? analog + 12 : analog;
}

export function parseDigital(
  raw: string,
  format: ClockFormat,
  currentHours: number,
): ClockTime | null {
  const match = raw.trim().match(/^(\d{1,2})\s*[:.,]\s*(\d{1,2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(h) || !Number.isInteger(minutes)) return null;
  if (minutes < 0 || minutes > 59) return null;

  if (format === "24") {
    if (h < 0 || h > 23) return null;
    return { hours: h, minutes };
  }
  if (h < 1 || h > 12) return null;
  return { hours: apply12hHour(h, currentHours), minutes };
}

export function analogEqual(a: ClockTime, b: ClockTime): boolean {
  return a.minutes === b.minutes && analogHour(a.hours) === analogHour(b.hours);
}

export function randomTime(format: ClockFormat): ClockTime {
  const minutes = Math.floor(Math.random() * 60);
  if (format === "24") {
    return { hours: Math.floor(Math.random() * 24), minutes };
  }
  return { hours: Math.floor(Math.random() * 12), minutes };
}

export function pointerAngleDeg(clientX: number, clientY: number, rect: DOMRect): number {
  const dx = clientX - (rect.left + rect.width / 2);
  const dy = clientY - (rect.top + rect.height / 2);
  let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

export function minutesFromAngle(deg: number): number {
  return Math.round(deg / 6) % 60;
}

export function nextTimeFromMinuteDrag(
  hours: number,
  prevMinutes: number,
  nextMinutes: number,
  hourLocked: boolean,
): ClockTime {
  let nextHours = hours;
  if (!hourLocked && nextMinutes !== prevMinutes) {
    if (prevMinutes > 45 && nextMinutes < 15) {
      nextHours = (hours + 1) % 24;
    } else if (prevMinutes < 15 && nextMinutes > 45) {
      nextHours = (hours + 23) % 24;
    }
  }
  return { hours: nextHours, minutes: nextMinutes };
}

export function hourLabel(hours: number): string {
  const n = Math.abs(hours);
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word = "часов";
  if (mod100 < 11 || mod100 > 14) {
    if (mod10 === 1) word = "час";
    else if (mod10 >= 2 && mod10 <= 4) word = "часа";
  }
  return `${n} ${word}`;
}

export function minuteLabel(minutes: number): string {
  return `${minutes} мин`;
}
