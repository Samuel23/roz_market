import types from "../data/types.json";

/**
 * What kind of thing a listing is: "Weapon - Katar", "Armor - Shield", "Card".
 *
 * Two sources, because neither answers alone.
 *
 * The vending packet carries a type field, and measured against real listings
 * it separates consumable, etc, armour, one-handed weapon, bow, two-handed
 * weapon and card - useful, but it calls a shield and a pair of shoes the same
 * thing, and it cannot tell a dagger from a two-handed spear.
 *
 * The client knows the rest, because it draws the tooltip: each item's
 * description carries a "Type : Katar" line. But only equipment and cards have
 * one - a Red Potion has no type line at all - so the client covers exactly
 * where the wire is vague, and the wire covers exactly where the client is
 * silent.
 */

type Tables = {
  subtype: Record<string, string>;
  class_of: Record<string, string>;
  wire_class: Record<string, string>;
};

const T = types as Tables;

export type ItemKind = {
  /** "Weapon", "Armor", "Card", "Consumable", "Etc" - or null if unknown. */
  cls: string | null;
  /** "Katar", "Shield", "Shoes" - null when the client says nothing. */
  sub: string | null;
};

export function itemKind(itemId: number, wireType: number | null): ItemKind {
  const sub = T.subtype[String(itemId)] ?? null;
  // The client's own word wins when it has one: it is more specific, and it
  // is what the item's tooltip says in game.
  const cls =
    (sub ? T.class_of[sub] : null) ??
    (wireType != null ? T.wire_class[String(wireType)] : null) ??
    null;
  // "Card - Card" and "Armor - Armor" are noise; one chip is the whole answer.
  return { cls, sub: sub && sub !== cls ? sub : null };
}
