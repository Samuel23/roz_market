/**
 * The link to one shop's whole stock.
 *
 * The map page already answers "what is in this shop, and where is it" - that
 * is what picking a pin does - so a shop title anywhere on the site points
 * there rather than growing a second view of the same thing.
 *
 * All three parts are in the URL because all three are needed to name a shop:
 * account ids are per world, and the map decides which vendors are fetched at
 * all. That also makes the link shareable, which a piece of local state in
 * the map page was not.
 */
export function shopPath(
  world: string,
  map: string,
  vendorId: number,
): string {
  const p = new URLSearchParams({
    world,
    map,
    vendor: String(vendorId),
  });
  return `/map?${p.toString()}`;
}
