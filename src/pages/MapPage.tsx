import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  listVendors,
  listShopStock,
  mapShopSummary,
  type ShopSummary,
  configured,
  type Listing,
  type Vendor,
} from "../lib/api";
import { ItemModal } from "../components/ItemModal";
import { ListingRow } from "../components/ListingRow";
import { MapRadar } from "../components/MapRadar";
import { ShopSign } from "../components/ShopSign";
import { NaviCopy } from "../components/NaviCopy";
import { ago, expiresIn, expiringSoon, isStale, zeny } from "../lib/format";
import { useWorld } from "../lib/world";
import maps from "../data/maps.json";

const MAPS = Object.keys(maps as Record<string, unknown>).sort();
const DEFAULT_MAP = "prt_mk_g1";

/**
 * Every vendor on one map at once.
 *
 * This is the view for deciding where to walk before deciding what to buy,
 * which is the order a market is actually shopped in.
 *
 * Two requests, not one, because the two halves of a market are collected
 * differently. Walking past a shop records where it is; only clicking it or
 * finding it in a search records what is inside. On the market map we
 * measured that was 186 shops standing there against 25 whose stock anyone
 * had looked at - so a map drawn from listings alone would omit seven shops
 * in eight, and would look complete while doing it.
 */
export function MapPage() {
  const { world, worlds, setWorld } = useWorld();
  // Which map, and which shop on it, live in the URL rather than in state.
  // A shop title anywhere on the site links here, and a link has to be able
  // to say which shop it means - so does a shared or reloaded URL.
  const [params, setParams] = useSearchParams();
  const asked = params.get("map");
  const map = asked && MAPS.includes(asked) ? asked : DEFAULT_MAP;
  const picked = Number(params.get("vendor")) || null;
  // Every write keeps the world in the URL, so a link the page produced is
  // as complete as one a listing row produced - an account id names nothing
  // without the world it lives on.
  const setMap = (m: string) => setParams({ world, map: m });
  const setPicked = (id: number | null) =>
    setParams(id ? { world, map, vendor: String(id) } : { world, map },
              { replace: true });

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [priced, setPriced] = useState<Map<number, ShopSummary>>(new Map());
  const [stock, setStock] = useState<Listing[]>([]);
  const [stockBusy, setStockBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<Listing | null>(null);

  // The URL and the world picker have to agree, and either can move first.
  //
  // Arriving on a link: the URL wins, because the link was written to point
  // at a shop on a particular server. Afterwards the picker wins, and the
  // shop goes with it - account ids are per world, so the one on screen does
  // not exist on the new one.
  //
  // "The URL wins on arrival" has to mean once, not always: applied remembers
  // which URL world has already been handed to the picker, so moving the
  // picker afterwards is not immediately undone by the value still sitting in
  // the address bar.
  const wanted = params.get("world");
  const applied = useRef<string | null>(null);
  useEffect(() => {
    if (wanted === world) {
      applied.current = wanted;
      return;
    }
    if (wanted && wanted !== applied.current
        && worlds.some((w) => w.world === wanted)) {
      applied.current = wanted;
      setWorld(wanted);
      return;
    }
    const next: Record<string, string> = { world, map };
    // A URL that simply never named a world is not a world change; filling it
    // in should not throw away the shop it did name.
    if (!wanted && picked) next.vendor = String(picked);
    applied.current = world;
    setParams(next, { replace: true });
    // setParams and setWorld are stable enough for this to run on a real
    // change rather than on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, world, worlds]);

  useEffect(() => {
    if (!configured) return;
    const stop = new AbortController();
    setBusy(true);
    Promise.all([
      listVendors(map, world, stop.signal).catch(() => [] as Vendor[]),
      // One row per shop, not one per listing. Deriving "which pins are lit"
      // from a page of the map's newest listings meant a busy map showed a
      // fraction of itself - 46 of 208 on prt_mk_g1 - and every shop somebody
      // opened pushed an earlier one back into the dark.
      mapShopSummary(map, world, stop.signal).catch(() => [] as ShopSummary[]),
    ])
      .then(([v, s]) => {
        setVendors(v);
        setPriced(new Map(s.map((r) => [r.vendor_id, r])));
      })
      .finally(() => setBusy(false));
    return () => stop.abort();
  }, [map, world]);

  // A clicked shop's stock is fetched for that shop, so it is complete
  // whether or not the shop is among the map's most recently updated.
  useEffect(() => {
    if (!configured || picked === null) {
      setStock([]);
      return;
    }
    const stop = new AbortController();
    setStockBusy(true);
    listShopStock(world, picked, stop.signal)
      .then((rows) => setStock(rows as Listing[]))
      .catch(() => setStock([]))
      .finally(() => setStockBusy(false));
    return () => stop.abort();
  }, [picked, world]);

  const pins = vendors.map((v) => {
    const p = priced.get(v.account_id);
    return {
      id: v.account_id,
      x: v.coord_x,
      y: v.coord_y,
      label: p
        ? `${v.shop_title ?? "(untitled)"} - ${p.listings} item(s), from ${zeny(p.cheapest)}`
        : `${v.shop_title ?? "(untitled)"} - no prices collected yet`,
      active: v.account_id === picked,
      dim: !p,
      kind: v.shop_kind,
    };
  });

  const chosen = vendors.find((v) => v.account_id === picked) ?? null;

  if (!configured) {
    return <p className="text-sm text-slate-400">Not connected - see the search page.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-400">
          Map{" "}
          <select
            value={map}
            onChange={(e) => setMap(e.target.value)}
            className="ml-1 rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200"
          >
            {MAPS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <span className="text-sm text-slate-500">
          {busy
            ? "loading..."
            : `${vendors.length} shop(s) seen here, ${priced.size} with prices`}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <MapRadar map={map} size={380} pins={pins} onPick={(id) => setPicked(Number(id))} />

        <div>
          {chosen === null ? (
            <p className="text-sm text-slate-400">
              Pick a pin to see what that shop had when a collector last looked.
              Dim pins are shops someone walked past but never opened.
            </p>
          ) : (
            <>
              <h2 className="mb-3 flex">
                <ShopSign title={chosen.shop_title} kind={chosen.shop_kind} variant="board" />
              </h2>
              <p className="mb-2 flex flex-wrap items-center gap-x-1 text-xs text-slate-500">
                {chosen.owner_name ? `${chosen.owner_name} - ` : ""}
                {chosen.vendor_kind === "assistant" ? "offline" : "in person"} -
                {chosen.coord_x != null && (
                  <NaviCopy map={map} x={chosen.coord_x} y={chosen.coord_y!} />
                )}
                - {isStale(chosen.last_seen, 1) ? "last seen" : "still there"}{" "}
                {ago(chosen.last_seen)}
              </p>
              {/* A shop nobody has walked past in an hour may simply not be
                  there. The index cannot know - a vendor closing looks exactly
                  like nobody having been back - so the page says which of the
                  two it is telling you, instead of implying the shop is still
                  standing because the row is still here. */}
              {isStale(chosen.last_seen, 1) && (
                <p className="mb-2 text-xs text-amber-300/90">
                  Nobody has walked past this shop in{" "}
                  {ago(chosen.last_seen).replace(" ago", "")}. It may well be
                  gone - vendors close without the index being told.
                </p>
              )}
              {/* The second clock, and the reason it is on its own line: for
                  most of the index these two ages are nothing like each other.
                  267 of 448 shops on file have never been opened at all, and
                  "seen 2 min ago" over six-hour-old prices was the page
                  claiming a freshness it did not have. */}
              <p className="mb-2 text-xs text-slate-500">
                {chosen.last_opened
                  ? `Stock last checked ${ago(chosen.last_opened)}.`
                  : "Nobody has opened this shop yet - only walked past it."}
              </p>
              {/* The assistant's own rental countdown, read off 0x0b62. It is
                  worth its own line rather than another dash-separated scrap:
                  it is the difference between a shop worth walking to and one
                  that will not be there when you arrive. */}
              {expiresIn(chosen.expires_at) && (
                <p
                  className={`mb-2 text-xs ${
                    expiringSoon(chosen.expires_at)
                      ? "text-amber-300/90"
                      : "text-slate-500"
                  }`}
                >
                  {expiresIn(chosen.expires_at) === "expired"
                    ? "This assistant's rental has run out - the shop is gone."
                    : `Rental ends in ${expiresIn(chosen.expires_at)}.`}
                </p>
              )}
              {chosen.shop_kind === "buy" && (
                <p className="mb-2 text-xs text-amber-300/90">
                  This is a buying store. These are the prices it will pay you,
                  not prices you can buy at.
                </p>
              )}
              {stockBusy ? (
                <p className="text-sm text-slate-400">Loading this shop's stock...</p>
              ) : stock.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Nobody has opened this shop yet, so the index knows where it is
                  but not what is in it.
                </p>
              ) : (
                // The same row the search page draws, minus the shop it came
                // from - the sign above already says that. Which means a
                // shop's stock gets the item's icon, its slots, its refine,
                // its cards and its random options, and opens the same panel
                // with the link out to MidgardHub.
                <div className="space-y-2">
                  {stock.map((l) => (
                    <ListingRow
                      key={l.listing_id}
                      listing={l}
                      onOpen={setOpen}
                      showShop={false}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {open && <ItemModal listing={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
