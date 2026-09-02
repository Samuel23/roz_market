import { Bot, MapPin, User } from "lucide-react";
import type { Listing } from "../lib/api";
import { ago, isStale, itemLabel, refineClass, zeny } from "../lib/format";
import { itemKind } from "../lib/itemtype";
import { ItemIcon } from "./ItemIcon";
import cards from "../data/cards.json";
import slots from "../data/slots.json";

const CARDS = cards as Record<string, string>;
// Only slotted items are in here - about 1,400 of 31,000 - so a miss means
// "no slots", not "unknown".
const SLOTS = slots as Record<string, number>;

function cardName(id: number): string {
  return CARDS[String(id)] ?? `#${id}`;
}

/**
 * One item for sale.
 *
 * The order is the order a buyer decides in: what it is, then what is in it,
 * then what it costs, then how to reach the seller. Age is last but always
 * shown - an index of stale prices that does not say so is worse than no
 * index.
 */
export function ListingRow({
  listing,
  onOpen,
}: {
  listing: Listing;
  onOpen: (l: Listing) => void;
}) {
  const stale = isStale(listing.updated_at);
  const kind = itemKind(listing.item_id, listing.item_type);
  return (
    <button
      type="button"
      onClick={() => onOpen(listing)}
      className={
        "w-full rounded-lg border border-slate-700/70 bg-slate-900/50 p-3 text-left transition hover:border-slate-500 hover:bg-slate-900 " +
        (stale ? "opacity-60" : "")
      }
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className={"inline-flex items-center gap-2 font-medium " + refineClass(listing.refine)}>
          <ItemIcon itemId={listing.item_id} size={22} />
          {itemLabel(listing.item_name, listing.refine, SLOTS[listing.item_id])}
          {listing.quantity > 1 && (
            <span className="ml-2 text-xs text-slate-400">x{listing.quantity}</span>
          )}
        </span>
        <span className="font-mono text-amber-200">{zeny(listing.price)}</span>
      </div>

      {(kind.cls || kind.sub) && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {kind.cls && (
            <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-[11px] text-slate-300">
              {kind.cls}
            </span>
          )}
          {kind.sub && (
            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-400">
              {kind.sub}
            </span>
          )}
        </div>
      )}

      {listing.cards.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {listing.cards.map((c, i) => (
            <span
              key={`${c}-${i}`}
              className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[11px] text-indigo-200"
            >
              {cardName(c)}
            </span>
          ))}
        </div>
      )}

      {listing.random_options.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {listing.random_options.map((o, i) => (
            <span
              key={`${o.index}-${i}`}
              className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] text-emerald-200"
            >
              {o.text ?? `option ${o.index} +${o.value}`}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
        {listing.vendor_kind === "assistant" ? (
          <span className="inline-flex items-center gap-1" title="Store Assistant - vending offline">
            <Bot className="h-3.5 w-3.5" /> offline
          </span>
        ) : (
          <span className="inline-flex items-center gap-1" title="a player vending in person">
            <User className="h-3.5 w-3.5" /> live
          </span>
        )}
        <span className="shop-title truncate text-slate-300">
          {listing.shop_title ?? "(untitled shop)"}
        </span>
        {listing.owner_name && <span className="text-slate-500">{listing.owner_name}</span>}
        {listing.coord_x != null && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {listing.map_name} {listing.coord_x},{listing.coord_y}
          </span>
        )}
        <span className="ml-auto">{ago(listing.updated_at)}</span>
      </div>
    </button>
  );
}
