import { Bot, User, Users } from "lucide-react";
import type { Listing } from "../lib/api";
import { ago, isStale, itemLabel, refineClass, zeny } from "../lib/format";
import { itemKind } from "../lib/itemtype";
import { ItemIcon } from "./ItemIcon";
import { ShopSign } from "./ShopSign";
import { shopPath } from "../lib/shop";
import { NaviCopy } from "./NaviCopy";
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
  showShop = true,
}: {
  listing: Listing;
  onOpen: (l: Listing) => void;
  /**
   * Whether to name the shop this came from.
   *
   * False inside one shop's own panel, where the sign is already the heading
   * over the list and repeating it on every row - with the same owner and the
   * same coordinates - is noise. Everything about the *item* stays.
   */
  showShop?: boolean;
}) {
  const stale = isStale(listing.updated_at);
  const kind = itemKind(listing.item_id, listing.item_type);
  // A shop with no known map cannot be shown on the map page, so its sign
  // stays a label. That is a vendor seen only in a search result, which
  // carries a title and a price but never a position.
  const shop = listing.map_name
    ? shopPath(listing.world, listing.map_name, listing.vendor_id)
    : undefined;
  return (
    <div
      className={
        "relative rounded-lg border border-slate-700/70 bg-slate-900/50 p-3 text-left transition hover:border-slate-500 hover:bg-slate-900 " +
        (stale ? "opacity-60" : "")
      }
    >
      {/*
        The card opens the item. It is an overlay rather than a wrapper
        because the shop sign inside it opens something else, and a button is
        not allowed to contain a link - which is what the sign became once it
        had somewhere to go. Absolutely positioned, so it paints over the
        static content below and keeps the whole card clickable; the sign
        lifts itself back above it with z-10.
      */}
      <button
        type="button"
        onClick={() => onOpen(listing)}
        aria-label={`Open ${listing.item_name}`}
        className="absolute inset-0 rounded-lg"
      />
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className={"inline-flex items-center gap-2 font-medium " + refineClass(listing.refine)}>
          <ItemIcon itemId={listing.item_id} size={22} />
          {itemLabel(listing.item_name, listing.refine, SLOTS[listing.item_id])}
          {listing.quantity > 1 && (
            <span className="ml-2 text-xs text-slate-400">x{listing.quantity}</span>
          )}
        </span>
        <span className="font-mono text-amber-200">
          {/* A buying store's price is what it pays you, not what you pay. */}
          {listing.shop_kind === "buy" && (
            <span className="mr-1 text-xs font-normal text-amber-300/70">pays</span>
          )}
          {zeny(listing.price)}
        </span>
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
        {showShop &&
          (listing.vendor_kind === "assistant" ? (
            <span className="inline-flex items-center gap-1" title="Store Assistant - vending offline">
              <Bot className="h-3.5 w-3.5" /> offline
            </span>
          ) : (
            <span className="inline-flex items-center gap-1" title="a player vending in person">
              <User className="h-3.5 w-3.5" /> live
            </span>
          ))}
        {showShop && (
          <ShopSign
            title={listing.shop_title}
            kind={listing.shop_kind}
            to={shop}
            className="relative z-10"
          />
        )}
        {showShop && listing.owner_name && (
          <span className="text-slate-500">{listing.owner_name}</span>
        )}
        {showShop && listing.coord_x != null && listing.map_name && (
          <NaviCopy
            map={listing.map_name}
            x={listing.coord_x}
            y={listing.coord_y!}
            className="relative z-10"
          />
        )}
        {/*
          How many people saw this, next to how long ago - the two things that
          say how much a number is worth. A single-source price is not marked
          as suspect, because at this population almost every price is one;
          it is marked as what it is, so a second report visibly means more.
        */}
        <span
          className={
            "ml-auto inline-flex items-center gap-1 " +
            (listing.confidence === "corroborated" ? "text-emerald-300/80" : "")
          }
          title={
            listing.confidence === "corroborated"
              ? `${listing.reports} independent collectors reported this`
              : "one collector reported this"
          }
        >
          <Users className="h-3.5 w-3.5" />
          {listing.reports > 1 ? `${listing.reports} reports` : "1 report"}
        </span>
        <span>{ago(listing.updated_at)}</span>
      </div>
    </div>
  );
}
