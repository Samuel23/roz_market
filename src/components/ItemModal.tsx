import { ExternalLink, X } from "lucide-react";
import { useEffect, useState } from "react";
import { priceHistory, type Listing, type PricePoint } from "../lib/api";
import { ago, itemLabel, zeny } from "../lib/format";
import slots from "../data/slots.json";

const SLOTS = slots as Record<string, number>;
import { itemPageUrl } from "../lib/midgard";
import { ItemIcon } from "./ItemIcon";
import { MapRadar } from "./MapRadar";
import { PriceChart } from "./PriceChart";
import { ShopSign } from "./ShopSign";
import { shopPath } from "../lib/shop";
import { NaviCopy } from "./NaviCopy";

/**
 * One listing, opened: where to walk, and what the item has been going for.
 *
 * The radar and the chart answer the two questions a price alone does not -
 * "is this a good price" and "can I actually get there" - which is why they
 * are here rather than on a separate page.
 */
export function ItemModal({
  listing,
  onClose,
}: {
  listing: Listing;
  onClose: () => void;
}) {
  const [points, setPoints] = useState<PricePoint[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const stop = new AbortController();
    setPoints(null);
    setFailed(false);
    // The listing's own world, not whatever the picker says. Opening a
    // Skadi listing and being shown Odin's price history would be worse than
    // showing none.
    priceHistory(listing.item_id, listing.world, 30, stop.signal)
      .then(setPoints)
      .catch((e) => {
        if (e.name !== "AbortError") setFailed(true);
      });
    return () => stop.abort();
  }, [listing.item_id, listing.world]);

  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-30 flex items-start justify-center overflow-auto bg-black/70 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-700 p-4">
          <div className="flex items-start gap-3">
            <ItemIcon itemId={listing.item_id} size={40} className="mt-0.5" />
            <div>
            <h2 className="text-lg font-medium text-slate-100">
              {itemLabel(listing.item_name, listing.refine, SLOTS[listing.item_id])}
            </h2>
            <p className="mt-0.5 text-sm text-slate-400">
              <span className="font-mono text-amber-200">{zeny(listing.price)}</span>
              {listing.quantity > 1 && <> - {listing.quantity} in stock</>} - seen{" "}
              {ago(listing.updated_at)}
            </p>
            {/* What this page deliberately does not try to be: an item
                database. Stats, drops and effects live on MidgardHub, which
                keys items by the same ids the game sends us. */}
            <a
              href={itemPageUrl(listing.item_id)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200 hover:underline"
            >
              Item info on MidgardHub
              <ExternalLink className="h-3 w-3" />
            </a>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 p-4 sm:grid-cols-[auto_1fr]">
          <div>
            <MapRadar
              map={listing.map_name}
              size={280}
              pins={[
                {
                  id: listing.vendor_id,
                  x: listing.coord_x,
                  y: listing.coord_y,
                  label: listing.shop_title ?? undefined,
                  active: true,
                  kind: listing.shop_kind,
                },
              ]}
            />
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex gap-2">
                <dt className="text-slate-500">Shop</dt>
                <dd className="min-w-0">
                  <ShopSign
                    title={listing.shop_title}
                    kind={listing.shop_kind}
                    to={
                      listing.map_name
                        ? shopPath(listing.world, listing.map_name, listing.vendor_id)
                        : undefined
                    }
                  />
                </dd>
              </div>
              {listing.owner_name && (
                <div className="flex gap-2">
                  <dt className="text-slate-500">Seller</dt>
                  <dd className="text-slate-200">{listing.owner_name}</dd>
                </div>
              )}
              <div className="flex gap-2">
                <dt className="text-slate-500">Where</dt>
                <dd className="text-slate-200">
                  {listing.coord_x == null || !listing.map_name ? (
                    "position unknown - nobody has walked past it yet"
                  ) : (
                    <NaviCopy
                      map={listing.map_name}
                      x={listing.coord_x}
                      y={listing.coord_y!}
                    />
                  )}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-slate-500">Vending</dt>
                <dd className="text-slate-200">
                  {listing.vendor_kind === "assistant"
                    ? "offline (Store Assistant)"
                    : "in person"}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-300">
              30-day price - lowest, and average
            </h3>
            {failed ? (
              <p className="text-sm text-slate-400">Could not load the price history.</p>
            ) : points === null ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : (
              <PriceChart points={points} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
