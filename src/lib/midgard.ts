/**
 * Item icons and item pages, from Midgard Community Hub.
 *
 * MidgardHub is the Ragnarok Zero Global database, and it keys items by the
 * same ids the game sends us - `700084` is Gakkung Bow there and here - so
 * both of these are a string template rather than a mapping table to maintain.
 *
 *   icon: https://midgardhub.com/images/items/<id>.gif
 *   page: https://midgardhub.com/database/items/<id>
 *
 * Two things to know about the icons. They are hotlinked, which works today -
 * checked with this site's own Referer, and there is no hotlink protection -
 * but it is somebody else's bandwidth and somebody else's URL scheme, so
 * `<ItemIcon>` is written to degrade to nothing rather than to a broken image.
 * And coverage is not total: a few newer items 404, and a 404 here answers
 * with a 38 kB HTML page rather than a small error, so it is worth failing
 * quietly and not retrying.
 *
 * If hotlinking ever stops being welcome or reliable, the icons are also in
 * the client's own GRF - the same place public/minimaps/ came from - and
 * self-hosting them is a build step, not a redesign.
 */

const BASE = "https://midgardhub.com";

export function itemIconUrl(itemId: number): string {
  return `${BASE}/images/items/${itemId}.gif`;
}

export function itemPageUrl(itemId: number): string {
  return `${BASE}/database/items/${itemId}`;
}
