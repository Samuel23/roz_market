import { useEffect, useMemo, useState } from "react";
import {
  listVendors,
  searchMarket,
  configured,
  type Listing,
  type Vendor,
} from "../lib/api";
import { ItemModal } from "../components/ItemModal";
import { MapRadar } from "../components/MapRadar";
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
  const { world } = useWorld();
  const [map, setMap] = useState(DEFAULT_MAP);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [rows, setRows] = useState<Listing[]>([]);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [open, setOpen] = useState<Listing | null>(null);

  useEffect(() => {
    if (!configured) return;
    const stop = new AbortController();
    setBusy(true);
    setPicked(null);
    Promise.all([
      listVendors(map, world, stop.signal).catch(() => [] as Vendor[]),
      // Newest first, so a map with more listings than one page keeps the
      // most recently confirmed ones.
      searchMarket({ map, world, sort: "time_desc", limit: 200 }, stop.signal)
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
              <h2 className="shop-title text-slate-200">
                {chosen.shop_title ?? "(untitled shop)"}
              </h2>
              <p className="mb-2 text-xs text-slate-500">
                {chosen.owner_name ? `${chosen.owner_name} - ` : ""}
                {chosen.vendor_kind === "assistant" ? "offline" : "in person"} -{" "}
                {chosen.coord_x}, {chosen.coord_y} - seen {ago(chosen.last_seen)}
              </p>
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
                      <span className="font-mono text-amber-200">{zeny(l.price)}</span>
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
