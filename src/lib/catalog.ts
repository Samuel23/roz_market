// The two client tables a buyer searches by name: cards, and random options.
//
// Both are small enough to load with the page (44 kB and 7 kB) - unlike the
// 31,000 item names, which are fetched on demand - and both are searched the
// same way: what was typed, matched against every name a player might know
// the thing by.
//
// A card has two such names. "Andre Card" is what drops and what a shop row
// says; "Hurricane" is the word it puts into the name of whatever it is
// socketed in, and it is the only name a player who has never held the card
// has seen. Searching one and not the other loses half the questions.
import cards from "../data/cards.json";
import options from "../data/options.json";
import { cardAffix, cardGoesBehind } from "./itemname";

const CARDS = cards as Record<string, string>;

export type CardEntry = {
  id: number;
  /** "Andre Card" */
  name: string;
  /** "Hurricane", or null for the ~1,100 cards that change no name. */
  affix: string | null;
  /** Whether the affix goes behind the item name: "Cutlas of Sandman". */
  behind: boolean;
};

export type OptionEntry = {
  /** The wire index. What the filter is actually sent as. */
  index: number;
  /** The client's own wording, with N where the roll goes: "ATK +N". */
  template: string;
};

export const CARD_LIST: CardEntry[] = Object.entries(CARDS)
  .map(([id, name]) => ({
    id: Number(id),
    name,
    affix: cardAffix(Number(id)),
    behind: cardGoesBehind(Number(id)),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const OPTION_LIST: OptionEntry[] = (options as [number, string][]).map(
  ([index, template]) => ({ index, template }),
);

const BY_CARD_ID = new Map(CARD_LIST.map((c) => [c.id, c]));
const BY_OPT_INDEX = new Map(OPTION_LIST.map((o) => [o.index, o]));

export function card(id: number): CardEntry | undefined {
  return BY_CARD_ID.get(id);
}

export function cardName(id: number): string {
  return BY_CARD_ID.get(id)?.name ?? `#${id}`;
}

/**
 * An option as the game words it, at a given floor.
 *
 * `min` 0 means the filter does not care what it rolled, which is a real
 * answer and not a missing one - so it says "any" rather than "+0", which
 * would read as a filter for a roll of nothing.
 */
export function optionLabel(index: number, min = 0): string {
  const t = BY_OPT_INDEX.get(index)?.template ?? `option ${index} +N`;
  return t.replace("N", min > 0 ? String(min) : "any");
}

function rank(needle: string, hay: string): number {
  const low = hay.toLowerCase();
  if (low === needle) return 0;
  if (low.startsWith(needle)) return 1;
  return low.includes(needle) ? 2 : -1;
}

/** Cards whose own name or whose affix matches, best match first. */
export function searchCards(text: string, limit = 8): CardEntry[] {
  const needle = text.trim().toLowerCase();
  if (needle.length < 2) return [];
  const hits: [number, CardEntry][] = [];
  for (const entry of CARD_LIST) {
    const byName = rank(needle, entry.name);
    const byAffix = entry.affix ? rank(needle, entry.affix) : -1;
    // A card found by the word it adds is ranked ahead of one found only
    // deep inside its own name: somebody typing "hurricane" means the affix.
    const best =
      byAffix >= 0 && (byName < 0 || byAffix < byName) ? byAffix : byName;
    if (best < 0) continue;
    hits.push([best, entry]);
  }
  hits.sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name));
  return hits.slice(0, limit).map(([, e]) => e);
}

/** Random options whose wording matches. */
export function searchOptions(text: string, limit = 8): OptionEntry[] {
  const needle = text.trim().toLowerCase();
  if (needle.length < 2) return [];
  const hits: [number, OptionEntry][] = [];
  for (const entry of OPTION_LIST) {
    // Matched against the template with the placeholder taken out, so typing
    // "atk" finds "ATK +N" and typing "atk +" does not have to guess whether
    // the N is there.
    const score = rank(needle, entry.template.replace(/\s*\+?N%?/g, " ").trim());
    const whole = rank(needle, entry.template);
    const best = score >= 0 ? score : whole;
    if (best < 0) continue;
    hits.push([best, entry]);
  }
  hits.sort((a, b) => a[0] - b[0] || a[1].index - b[1].index);
  return hits.slice(0, limit).map(([, e]) => e);
}
