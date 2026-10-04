/** Utilitaires de dates sans dépendance. Les dates « jour » sont des chaînes YYYY-MM-DD en heure locale. */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(now = new Date()): string {
  return toISODate(now);
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function diffDays(fromISO: string, toISO: string): number {
  const a = parseISODate(fromISO).getTime();
  const b = parseISODate(toISO).getTime();
  return Math.round((b - a) / 86_400_000);
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(options: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify(options);
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("fr-FR", options);
    fmtCache.set(key, f);
  }
  return f;
}

/** « jeu. 16 oct. » */
export function formatShortDay(iso: string): string {
  return fmt({ weekday: "short", day: "numeric", month: "short" }).format(parseISODate(iso));
}

/** « JEUDI 16 » */
export function formatDayHeading(iso: string): string {
  const d = parseISODate(iso);
  return `${fmt({ weekday: "long" }).format(d)} ${d.getDate()}`.toUpperCase();
}

export function formatLongDate(iso: string): string {
  return fmt({ weekday: "long", day: "numeric", month: "long" }).format(parseISODate(iso));
}

export function formatMonthYear(iso: string): string {
  return fmt({ month: "long", year: "numeric" }).format(parseISODate(iso));
}

/** « Aujourd'hui », « Demain » ou « jeu. 16 oct. » */
export function relativeDay(iso: string, today = todayISO()): string {
  const diff = diffDays(today, iso);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  return formatShortDay(iso);
}

export function formatTime(time: string): string {
  return time.replace(":", "h");
}

/** « il y a 5 min », « il y a 2 h », « hier », « 12 oct. » */
export function timeAgo(timestamp: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - timestamp) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "hier";
  if (d < 7) return `il y a ${d} j`;
  return fmt({ day: "numeric", month: "short" }).format(new Date(timestamp));
}

export function clockTime(timestamp: number): string {
  return fmt({ hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
}
