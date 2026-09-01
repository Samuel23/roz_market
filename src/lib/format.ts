// Formatting that has to match what a player sees in game.

/** 1250000 -> "1,250,000z". Prices in RO are read at a glance, so grouping
 *  matters more than compactness. */
export function zeny(n: number): string {
  return `${n.toLocaleString("en-US")}z`;
}

/** A shorter form for axis labels, where the full number will not fit. */
export function zenyShort(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}b`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}

/** "3 minutes ago". Freshness is the thing a price index is judged on, so
 *  this is deliberately blunt about age rather than rounding it away. */
export function ago(iso: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "unknown";
  const secs = Math.max(0, (Date.now() - then) / 1000);
  if (secs < 90) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Listings older than this are shown dimmed: the collector that saw them has
 *  not been back, so the shop may well be gone. */
export function isStale(iso: string, hours = 6): boolean {
  const then = Date.parse(iso);
  return Number.isFinite(then) && Date.now() - then > hours * 3600_000;
}

/** "+7 Composite Bow" - the refine goes in front, the way the game writes it. */
export function itemLabel(name: string, refine: number): string {
  return refine > 0 ? `+${refine} ${name}` : name;
}

/** Colour the refine the way the client does: unremarkable up to +6, notable
 *  from +7, and loud from +10. */
export function refineClass(refine: number): string {
  if (refine >= 10) return "text-amber-300";
  if (refine >= 7) return "text-emerald-300";
  return "text-slate-300";
}
