import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  listVendors,
  searchMarket,
  configured,
  type Listing,
  type Vendor,
} from "../lib/api";
import { ItemModal } from "../components/ItemModal";
import { MapRadar } from "../components/MapRadar";
import { ShopSign } from "../components/ShopSign";
import { NaviCopy } from "../components/NaviCopy";
import { ago, zeny } from "../lib/format";
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
  const [rows, setRows] = useState<Listing[]>([]);
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
      // Newest first, so a map with more listings than one page keeps the
      // most recently confirmed ones.
      // "any": on a map you are looking at particular shops, and a buying
      // store's stock is the whole point of clicking its pin. The search page
      // asks for asks; here both belong, labelled.
      searchMarket({ map, world, kind: "any", sort: "time_desc", limit: 200 },
                   stop.signal)
        .then((r) => r.rows)
        .catch(() => [] as Listing[]),
    ])
      .then(([v, l]) => {
        setVendors(v);
        setRows(l);
      })
      .finally(() => setBusy(false));
    return () => stop.abort();
  }, [map, world]);

  const priced = useMemo(() => {
    const by = new Map<number, { count: number; cheapest: number }>();
    for (const l of rows) {
      const got = by.get(l.vendor_id);
      if (got) {
        got.count += 1;
        got.cheapest = Math.min(got.cheapest, l.price);
      } else {
        by.set(l.vendor_id, { count: 1, cheapest: l.price });
      }
    }
    return by;
  }, [rows]);

  const pins = vendors.map((v) => {
    const p = priced.get(v.account_id);
    return {
      id: v.account_id,
      x: v.coord_x,
      y: v.coord_y,
      label: p
        ? `${v.shop_title ?? "(untitled)"} - ${p.count} item(s), from ${zeny(p.cheapest)}`
        : `${v.shop_title ?? "(untitled)"} - no prices collected yet`,
      active: v.account_id === picked,
      dim: !p,
    };
  });

  const chosen = vendors.find((v) => v.account_id === picked) ?? null;
  const stock = picked ? rows.filter((l) => l.vendor_id === picked) : [];

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
                - seen {ago(chosen.last_seen)}
              </p>
              {chosen.shop_kind === "buy" && (
                <p className="mb-2 text-xs text-amber-300/90">
                  This is a buying store. These are the prices it will pay you,
                  not prices you can buy at.
                </p>
              )}
              {stock.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Nobody has opened this shop yet, so the index knows where it is
                  but not what is in it.
                </p>
              ) : (
                <div className="space-y-1">
                  {stock.map((l) => (
                    <button
                      key={l.listing_id}
                      type="button"
                      onClick={() => setOpen(l)}
                      className="flex w-full items-baseline justify-between gap-4 rounded border border-slate-800 px-3 py-1.5 text-left text-sm hover:border-slate-600"
                    >
                      <span className="text-slate-200">
                        {l.refine > 0 ? `+${l.refine} ` : ""}
                        {l.item_name}
                        {l.quantity > 1 && (
                          <span className="ml-1 text-xs text-slate-500">x{l.quantity}</span>
                        )}
                      </span>
                      <span className="font-mono text-amber-200">
                        {chosen.shop_kind === "buy" ? "pays " : ""}
                        {zeny(l.price)}
                      </span>
                    </button>
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
