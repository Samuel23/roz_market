// A stand-in for the two Supabase Edge Functions, for developing the UI
// without a database.
//
// It answers from tools/fixture.json, which is a real market recording put
// through the real collector:
//
//   python ro_market.py captures/market_20260901_102542 \
//       --json C:/roz_market/tools/fixture.json
//
// That matters more than convenience. Hand-written mock data is written by
// someone who already knows what the UI expects, so it agrees with the UI by
// construction and proves nothing. This is 191 vendors and 206 listing rows
// the client actually sent.
//
// The names in it are stand-ins - see scrub-fixture.mjs - but they are the
// same length as the originals and keep each character's class, so the shapes
// a layout has to survive are real: a 36-character title, umlauts, a shop
// called '^,^', and one that is a row of stars around a kaomoji.
//
//   node tools/mock-api.mjs      # http://localhost:54321
//
// Then put this in .env.local:
//   VITE_SUPABASE_URL=http://localhost:54321
//   VITE_SUPABASE_ANON_KEY=dev
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 54321);

const fixture = JSON.parse(readFileSync(join(HERE, "fixture.json"), "utf-8"));

// Flatten observations the way ingest_observation would: one row per listing,
// keyed the way the SQL keys it, so two sightings of the same item collapse
// instead of appearing twice.
const rows = new Map();
for (const obs of fixture.observations) {
  for (const l of obs.listings) {
    const sig = [
      obs.vendor.account_id,
      l.item_id,
      l.refine,
      l.cards.join(","),
      l.random_options.map((o) => `${o.index}:${o.value}`).join(","),
      l.slot ?? -1,
    ].join("|");
    const prev = rows.get(sig);
    if (prev && prev.observed_at > obs.observed_at) continue;
    rows.set(sig, {
      observed_at: obs.observed_at,
      row: {
        listing_id: sig,
        item_id: l.item_id,
        item_name: l.item_name,
        item_type: l.item_type,
        price: l.price,
        quantity: l.quantity,
        refine: l.refine,
        cards: l.cards,
        random_options: l.random_options,
        vendor_id: obs.vendor.account_id,
        shop_title: obs.vendor.shop_title,
        owner_name: obs.vendor.owner_name,
        vendor_kind: obs.vendor.vendor_kind,
        shop_kind: obs.vendor.shop_kind ?? "sell",
        map_name: obs.vendor.map_name,
        coord_x: obs.vendor.coord_x,
        coord_y: obs.vendor.coord_y,
        updated_at: new Date(obs.observed_at * 1000).toISOString(),
      },
    });
  }
}
// The capture is from a fixed date; shifting it to now keeps "3 min ago" from
// reading "8 months ago" on every row and hiding the staleness styling.
const newest = Math.max(...[...rows.values()].map((r) => r.observed_at));
const shift = Date.now() / 1000 - newest;
const LISTINGS = [...rows.values()].map(({ row, observed_at }) => ({
  ...row,
  updated_at: new Date((observed_at + shift) * 1000).toISOString(),
}));

// The fixture was recorded before the index knew worlds existed, on Skadi.
// Stamping it here rather than rewriting the file keeps the recording as it
// was captured and still exercises the world plumbing the real API now has.
const WORLD = "skadi";
const WORLDS = [
  { world: "skadi", label: "Skadi (EU)",  region: "EU",  hostname: "eu-roz-1.mygnjoy.com",  sort: 1 },
  { world: "odin",  label: "Odin (SEA)",  region: "SEA", hostname: "sea-roz-1.mygnjoy.com", sort: 2 },
  { world: "loki",  label: "Loki (SEA)",  region: "SEA", hostname: "sea-roz-2.mygnjoy.com", sort: 3 },
];

// The vendors walked past but never priced still belong on the map page.
const PLACED = fixture.vendors.filter((v) => v.coord_x !== null);

console.log(
  `mock API: ${LISTINGS.length} listings, ${PLACED.length} placed vendors, map ${fixture.map}`,
);

function search(p) {
  const q = (p.get("q") ?? "").toLowerCase();
  const itemId = Number(p.get("item_id")) || null;
  const minPrice = Number(p.get("min_price")) || null;
  const maxPrice = Number(p.get("max_price")) || null;
  const refine = Number(p.get("refine")) || null;
  const cardId = Number(p.get("card_id")) || null;
  const optId = Number(p.get("opt_id")) || null;
  const map = p.get("map") || null;
  const world = p.get("world") || null;
  const sort = p.get("sort") ?? "price_asc";
  // Asks unless asked otherwise, the same default the real function has: a
  // buying store's price is a bid and belongs nowhere near "cheapest".
  const kind = p.get("kind") ?? "sell";
  const limit = Math.min(200, Number(p.get("limit")) || 50);
  const offset = Number(p.get("offset")) || 0;

  let hits = LISTINGS.filter((l) => {
    if (q && !(l.item_name.toLowerCase().includes(q) ||
               (l.shop_title ?? "").toLowerCase().includes(q))) return false;
    if (itemId && l.item_id !== itemId) return false;
    if (minPrice && l.price < minPrice) return false;
    if (maxPrice && l.price > maxPrice) return false;
    if (refine && l.refine < refine) return false;
    if (cardId && !l.cards.includes(cardId)) return false;
    if (optId && !l.random_options.some((o) => o.index === optId)) return false;
    if (map && l.map_name !== map) return false;
    // Everything here is Skadi, so asking for another world correctly
    // returns nothing - the same as the real API before anyone plays there.
    if (world && world !== WORLD) return false;
    if (kind !== "any" && (l.shop_kind ?? "sell") !== kind) return false;
    return true;
  });

  if (sort === "price_desc") hits.sort((a, b) => b.price - a.price);
  else if (sort === "time_desc") hits.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  else hits.sort((a, b) => a.price - b.price);

  const rows = hits.slice(offset, offset + limit).map((l) => ({ ...l, world: WORLD }));
  return { rows, total: hits.length, limit, offset };
}

// A plausible 30-day series so the chart can be looked at before the real
// rollup has ever run. Clearly synthetic: it walks from the current price, it
// is not claiming to be history.
function history(itemId, days) {
  const seed = LISTINGS.filter((l) => l.item_id === itemId);
  if (seed.length === 0) return [];
  const base = Math.min(...seed.map((l) => l.price));
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const wobble = 1 + Math.sin(i / 3.1) * 0.12 + (i % 5) * 0.01;
    const min = Math.round(base * wobble);
    out.push({
      date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
      min,
      avg: Math.round(min * 1.18),
      max: Math.round(min * 1.45),
      volume: 3 + (i % 7),
      listings: 1 + (i % 4),
    });
  }
  return out;
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Content-Type": "application/json",
  };
  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    res.end();
    return;
  }
  let body;
  if (url.pathname.endsWith("/search-market")) {
    body = search(url.searchParams);
  } else if (url.pathname.endsWith("/price-history")) {
    const itemId = Number(url.searchParams.get("item_id"));
    const days = Math.min(365, Number(url.searchParams.get("days")) || 30);
    const world = (url.searchParams.get("world") ?? "").trim();
    if (!world) {
      // The real function refuses this, because a chart across three
      // economies is a line through numbers that were never true anywhere.
      res.writeHead(400, headers);
      res.end(JSON.stringify({ error: "world is required" }));
      return;
    }
    body = {
      item_id: itemId, world, days,
      points: world === WORLD ? history(itemId, days) : [],
    };
  } else if (url.pathname.endsWith("/rest/v1/worlds")) {
    body = WORLDS;
  } else if (url.pathname.endsWith("/rest/v1/vendors")) {
    // PostgREST's filter syntax, only as far as the map page uses it.
    const eq = (url.searchParams.get("map_name") ?? "").replace(/^eq\./, "");
    const wq = (url.searchParams.get("world") ?? "").replace(/^eq\./, "");
    body = PLACED.filter((v) => (!eq || v.map_name === eq)
                             && (!wq || wq === WORLD)).map((v) => ({
      world: WORLD,
      account_id: v.account_id,
      shop_title: v.shop_title,
      owner_name: v.owner_name,
      vendor_kind: v.vendor_kind,
      shop_kind: v.shop_kind ?? null,
      map_name: v.map_name,
      coord_x: v.coord_x,
      coord_y: v.coord_y,
      last_seen: new Date((v.last_seen + shift) * 1000).toISOString(),
    }));
  } else {
    res.writeHead(404, headers);
    res.end(JSON.stringify({ error: "no such function" }));
    return;
  }
  res.writeHead(200, headers);
  res.end(JSON.stringify(body));
}).listen(PORT, () => console.log(`listening on http://localhost:${PORT}`));
