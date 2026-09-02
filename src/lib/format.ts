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

/**
 * "+7 Composite Bow [4]" - the way the game writes it: refine in front, slot
 * count behind.
 *
 * The slot count is not in the listing. The server never sends it - it is
 * client-side data looked up when the name is drawn - so it comes from a table
 * extracted from the client and shipped with the page. Items with no slots get
 * nothing, not "[0]", which is also what the game does.
 */
export function itemLabel(name: string, refine: number, slots = 0): string {
  const base = refine > 0 ? `+${refine} ${name}` : name;
  return slots > 0 ? `${base} [${slots}]` : base;
}

/** Colour the refine the way the client does: unremarkable up to +6, notable
 *  from +7, and loud from +10. */
export function refineClass(refine: number): string {
  if (refine >= 10) return "text-amber-300";
  if (refine >= 7) return "text-emerald-300";
  return "text-slate-300";
}

/**
 * How long an offline Store Assistant has left, phrased the way the game
 * phrases it under the shop's stock list.
 *
 * Only assistants have a clock - a player vending in person stands there
 * until they log off - so `null` in, `null` out, and the caller shows
 * nothing rather than an empty label.
 *
 * Rounded to the unit that matters at the scale being shown: at three hours
 * nobody cares about the seconds, and under a minute the number is changing
 * faster than the page reads it. A rental that has already run out reports
 * itself as expired instead of counting into the negatives - the shop is
 * gone from the game whether or not a collector has been back to notice.
 */
export function expiresIn(iso: string | null): string | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return null;
  const secs = (at - Date.now()) / 1000;
  if (secs <= 0) return "expired";
  if (secs < 60) return "under a minute";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours < 24) return rem ? `${hours}h ${rem}m` : `${hours}h`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

/** An assistant this close to the end may well be gone before you walk there. */
export function expiringSoon(iso: string | null, mins = 30): boolean {
  if (!iso) return false;
  const at = Date.parse(iso);
  return Number.isFinite(at) && at - Date.now() < mins * 60_000;
}
