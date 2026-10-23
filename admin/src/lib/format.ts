/** Display helpers. Keep formatting out of the pages. */

export function toman(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n)) + " T";
}

export function usd(n: number) {
  return "$" + n.toFixed(2).replace(/\.00$/, "");
}

export function date(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(d);
}

/** Whole days from today until `d`. Negative means it already passed. */
export function daysUntil(d: Date) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function daysLabel(n: number) {
  if (n < 0) return `${Math.abs(n)}d overdue`;
  if (n === 0) return "today";
  return `in ${n}d`;
}
