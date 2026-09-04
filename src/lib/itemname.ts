// The name a player would actually read, composed the way the client composes
// it.
//
// The server sends an item id, a refine and up to four card ids. Everything
// else in the name is client-side: a Katar with two Critical Cards in it is a
// "Double Critical Katar" in game, and a page that calls it "Katar" is naming
// a different thing than the buyer is looking for.
//
// The rules are roBrowser's `DB.getItemName`, which is a straight port of the
// client's own: refine in front, then the prefixes in the order the cards sit
// in the sockets, then the item, then the postfixes, then the slot count.
// Repeats collapse into Double/Triple/Quadruple rather than repeating the
// word.
import affixes from "../data/cardaffix.json";

/** card id -> [affix word, 1 if it goes behind the name]. 264 of ~1,400 cards
 *  have one; a miss means the card changes the name not at all. */
const AFFIX = affixes as unknown as Record<string, [string, 0 | 1]>;

const COUNT = ["", "Double ", "Triple ", "Quadruple "];

/**
 * Card slots that are not cards.
 *
 * The first slot doubles as a tag for items that were made rather than
 * socketed - a forged weapon keeps its smith's name and element there, a
 * brewed item its brewer, a pet egg its pet - so those ids must never be
 * looked up in the card table. They also suppress the slot count, because the
 * game does not print "[4]" on a forged sword.
 */
const FORGE = 0x00ff;
const CREATE = 0x00fe;
const PET = 0xff00;

export function isCrafted(cards: number[] | null | undefined): boolean {
  const first = cards?.[0];
  return first === FORGE || first === CREATE || first === PET;
}

/** The affix word a card contributes, if it has one. */
export function cardAffix(id: number): string | null {
  return AFFIX[String(id)]?.[0] ?? null;
}

/** Whether that word goes behind the item name rather than in front of it. */
export function cardGoesBehind(id: number): boolean {
  return AFFIX[String(id)]?.[1] === 1;
}

/**
 * "+7 Double Critical Katar [3]" - refine, card affixes, name, slots.
 *
 * `slots` is client-side data too (the server never sends it) and comes from
 * the same table the plain label uses. Items with no slots get nothing rather
 * than "[0]", which is also what the game does.
 */
export function composeItemName(
  name: string,
  refine: number,
  slots = 0,
  cards: number[] = [],
): string {
  let prefix = "";
  let postfix = "";
  let showSlots = true;

  if (isCrafted(cards)) {
    // A forged or brewed item's "cards" are a smith id and an element, not
    // cards. Naming those properly needs a character name the index does not
    // hold, so it stays the plain item name - but the slot count must still
    // go, or the row claims sockets the item does not have.
    showSlots = false;
  } else {
    // Order of first appearance, so the sockets read left to right the way
    // the tooltip does; the count decides Double/Triple/Quadruple.
    const order: number[] = [];
    const seen = new Map<number, number>();
    for (const card of cards) {
      if (!card) continue;
      if (!seen.has(card)) {
        seen.set(card, 0);
        order.push(card);
      } else {
        seen.set(card, seen.get(card)! + 1);
      }
    }
    for (const card of order) {
      const affix = cardAffix(card);
      if (!affix) continue;
      const many = COUNT[Math.min(seen.get(card)!, COUNT.length - 1)];
      if (cardGoesBehind(card)) postfix += ` ${many}${affix}`;
      else prefix += `${many}${affix} `;
    }
  }

  const head = refine > 0 ? `+${refine} ` : "";
  const tail = showSlots && slots > 0 ? ` [${slots}]` : "";
  return `${head}${prefix}${name}${postfix}${tail}`;
}
