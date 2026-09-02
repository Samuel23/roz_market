// The two read APIs, and the shapes they answer with.
//
// Both are Supabase Edge Functions backed by indexed SQL. The anon key is
// public on purpose - row-level security grants it SELECT on the four market
// tables and nothing else, and the ingest function is revoked from it - so
// shipping it in the bundle gives a reader no authority they did not already
// have by visiting the page.

const URL_BASE = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const configured = Boolean(URL_BASE && ANON);

export type Listing = {
  listing_id: string;
  item_id: number;
  item_name: string;
  item_type: number | null;
  price: number;
  quantity: number;
  refine: number;
  cards: number[];
  random_options: { index: number; value: number; param: number; text?: string }[];
  vendor_id: number;
  shop_title: string | null;
  owner_name: string | null;
  vendor_kind: "player" | "assistant" | null;
  map_name: string | null;
  coord_x: number | null;
  coord_y: number | null;
  updated_at: string;
  world: string;
  /**
   * Which way the shop trades, and therefore what the price means.
   *
   * "sell" is a vending shop and the price is an ask - what you would pay.
   * "buy" is a buying store and the price is a bid - what they would pay you.
   * They are not comparable: bids run at a fraction of asks, so the index
   * asks for asks and a caller who wants bids says so.
   */
  shop_kind: ShopKind;
  /**
   * How well attested this price is.
   *
   * "corroborated" means two collectors on different networks reported the
   * same shop slot at the same price; "single" means one did and it was
   * published anyway, because while there are barely any contributors a rule
   * that needed two would publish nothing at all.
   *
   * Shown rather than hidden. The page already stakes its credibility on
   * printing an age for every row - printing how many people saw it is the
   * same promise, and it makes a lie visible to the reader even when it gets
   * through.
   */
  confidence: "corroborated" | "single";
  reports: number;
};

export type ShopKind = "sell" | "buy";

export type World = {
  world: string;
  label: string;
  region: string | null;
  hostname: string | null;
  sort: number;
};

export type SearchResult = {
  rows: Listing[];
  total: number;
  limit: number;
  offset: number;
};

export type PricePoint = {
  date: string;
  min: number;
  avg: number;
  max: number;
  /** Units on offer that day. Stock on the shelf, not sales. */
  stock_offered: number;
  /**
   * Units actually sold that day.
   *
   * Real turnover, from stock decreases inside one shop session that two
   * independent collectors both saw. Zero until somebody opens the same shop
   * twice, which is most shops - it is a bonus signal, not the index. This
   * field used to be sum(quantity) and therefore measured the opposite thing.
   */
  volume: number;
  listings: number;
};

export type Vendor = {
  world: string;
  account_id: number;
  shop_title: string | null;
  owner_name: string | null;
  vendor_kind: "player" | "assistant" | null;
  /** Null until a sign for this shop has been in someone's view. */
  shop_kind: ShopKind | null;
  map_name: string | null;
  coord_x: number | null;
  coord_y: number | null;
  /**
   * When an offline Store Assistant's rental ends - the countdown the game
   * shows under its stock list. Null for a live player standing there in
   * person, who has no timer: an answer, not a gap.
   */
  expires_at: string | null;
  /** The shop was still standing on the map. Says nothing about its prices. */
  last_seen: string;
  /**
   * Somebody opened the shop and saw its whole stock. Null means nobody ever
   * has - it is known only from walking past or from a search, so whatever
   * prices are shown for it are partial.
   */
  last_opened: string | null;
};

export type Query = {
  q?: string;
  item_id?: number;
  min_price?: number;
  max_price?: number;
  refine?: number;
  card_id?: number;
  opt_id?: number;
  map?: string;
  world?: string;
  /** Omitted means asks only. "any" is for looking at one shop. */
  kind?: ShopKind | "any";
  sort?: "price_asc" | "price_desc" | "time_desc";
  limit?: number;
  offset?: number;
};

function headers() {
  return { apikey: ANON, Authorization: `Bearer ${ANON}` };
}

function url(fn: string, params: Record<string, unknown>) {
  const u = new URL(`${URL_BASE}/functions/v1/${fn}`);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

export async function searchMarket(
  query: Query,
  signal?: AbortSignal,
): Promise<SearchResult> {
  if (!configured) throw new Error("not configured");
  const res = await fetch(url("search-market", query), {
    headers: headers(),
    signal,
  });
  if (!res.ok) throw new Error(`search failed (${res.status})`);
  return res.json();
}

/**
 * Every vendor indexed on one map, priced or not.
 *
 * Read straight from PostgREST rather than through an Edge Function: it is a
 * plain filtered select on a table the anon key already has SELECT on, and
 * wrapping that in a function would add a deploy step and a cold start for
 * nothing.
 *
 * The map page needs this because most of a market has no prices. Walking
 * past a shop records where it is and what it is called; only clicking it or
 * finding it in a search records what is inside. A map drawn from listings
 * alone would leave out the majority of the shops standing there.
 */
export async function listVendors(
  map: string,
  world: string,
  signal?: AbortSignal,
): Promise<Vendor[]> {
  if (!configured) throw new Error("not configured");
  const u = new URL(`${URL_BASE}/rest/v1/vendors`);
  u.searchParams.set(
    "select",
    "world,account_id,shop_title,owner_name,vendor_kind,shop_kind," +
      "map_name,coord_x,coord_y,expires_at,last_seen,last_opened",
  );
  u.searchParams.set("map_name", `eq.${map}`);
  u.searchParams.set("world", `eq.${world}`);
  u.searchParams.set("coord_x", "not.is.null");
  u.searchParams.set("order", "last_seen.desc");
  u.searchParams.set("limit", "1000");
  const res = await fetch(u.toString(), { headers: headers(), signal });
  if (!res.ok) throw new Error(`vendors failed (${res.status})`);
  return res.json();
}

/**
 * A day's high, low and mean for one item, on ONE world.
 *
 * The world is required rather than optional. Skadi, Odin and Loki are three
 * separate economies that share nothing but an item table, so a chart drawn
 * across all of them is a line through numbers that were never true anywhere.
 */
export async function priceHistory(
  itemId: number,
  world: string,
  days = 30,
  signal?: AbortSignal,
): Promise<PricePoint[]> {
  if (!configured) throw new Error("not configured");
  const res = await fetch(url("price-history", { item_id: itemId, world, days }), {
    headers: headers(),
    signal,
  });
  if (!res.ok) throw new Error(`history failed (${res.status})`);
  const body = await res.json();
  return body.points ?? [];
}

/**
 * The worlds the index knows about.
 *
 * Read from the table rather than hardcoded, because a world is data: the
 * server can add one, and the addresses that identify them are Cloudflare's
 * and can be renumbered underneath.
 */
export async function listWorlds(signal?: AbortSignal): Promise<World[]> {
  if (!configured) throw new Error("not configured");
  const u = new URL(`${URL_BASE}/rest/v1/worlds`);
  u.searchParams.set("select", "world,label,region,hostname,sort");
  u.searchParams.set("order", "sort.asc");
  const res = await fetch(u.toString(), { headers: headers(), signal });
  if (!res.ok) throw new Error(`worlds failed (${res.status})`);
  return res.json();
}

/** One row per shop on a map: how much it is holding and how cheap it starts. */
export type ShopSummary = {
  vendor_id: number;
  listings: number;
  cheapest: number;
  newest: string;
};

/**
 * What every pin on a map is holding, one row per shop.
 *
 * The map used to derive this from a page of the map's 200 newest listings,
 * which stopped being the whole map some time ago: on prt_mk_g1 that page
 * covers 46 of the 208 shops that have prices, and every shop a contributor
 * opens pushes an earlier one out of it. This asks the question the page is
 * actually asking - "which shops have prices, and from how much" - so the
 * answer does not depend on how much stock the rest of the map is holding.
 */
export async function mapShopSummary(
  map: string,
  world: string,
  signal?: AbortSignal,
): Promise<ShopSummary[]> {
  if (!configured) throw new Error("not configured");
  const res = await fetch(`${URL_BASE}/rest/v1/rpc/map_shop_summary`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ p_world: world, p_map: map }),
    signal,
  });
  if (!res.ok) throw new Error(`shop summary failed (${res.status})`);
  return res.json();
}

/**
 * Everything one shop is holding.
 *
 * Fetched when a pin is clicked rather than sliced out of a map-wide page,
 * so a shop's stock is complete whether or not it was among the map's most
 * recently updated. The vendor's own details are already on the page - they
 * came with the pin - so this reads the listing rows directly and the caller
 * pairs them up.
 */
export async function listShopStock(
  world: string,
  vendorId: number,
  signal?: AbortSignal,
): Promise<Omit<Listing, keyof VendorFacts>[]> {
  if (!configured) throw new Error("not configured");
  const u = new URL(`${URL_BASE}/rest/v1/market_listings`);
  u.searchParams.set(
    "select",
    "id,item_id,item_name,item_type,price,quantity,refine,cards," +
      "random_options,slot,updated_at,world,confidence,reports,vendor_id",
  );
  u.searchParams.set("world", `eq.${world}`);
  u.searchParams.set("vendor_id", `eq.${vendorId}`);
  u.searchParams.set("order", "price.asc");
  const res = await fetch(u.toString(), { headers: headers(), signal });
  if (!res.ok) throw new Error(`shop stock failed (${res.status})`);
  const rows = await res.json();
  return rows.map((r: Record<string, unknown>) => ({
    ...r,
    listing_id: String(r.id),
  }));
}

/** The vendor half of a Listing, which the map already knows from the pin. */
type VendorFacts = {
  shop_title: string | null;
  owner_name: string | null;
  vendor_kind: "player" | "assistant" | null;
  map_name: string | null;
  coord_x: number | null;
  coord_y: number | null;
  shop_kind: ShopKind | null;
};
