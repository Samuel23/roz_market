import { useState } from "react";
import { Link } from "react-router-dom";
import type { ShopKind } from "../lib/api";

/**
 * A shop's title, drawn the way the client draws it.
 *
 * In game a shop is not a line of text next to a player's name - it is a small
 * white board floating over the vendor's head, with a 24x24 icon on the left
 * saying which kind of shop it is. That distinction is the whole point here:
 * a listing row carries both a shop title and an owner name, and as two plain
 * grey spans they read as the same kind of thing. One of them is a sign the
 * seller wrote; the other is a person. The board says which is which without
 * a label.
 *
 * The layout is roBrowserLegacy's, which is a working client:
 * src/UI/Components/EntityRoom/EntityRoom.css - white ground, 5px radius,
 * a #c1c6c2 hairline, the icon then the title, and the title ellipsised
 * rather than wrapped.
 *
 * The two icons are the client's own, lifted out of data.grf by
 * packet_probe/build_shop_icons.py:
 *
 *   shop-sell.png   data/texture/유저인터페이스/shop.bmp        a zeny bag
 *   shop-buy.png    data/texture/유저인터페이스/buyingshop.bmp  a bundle of goods
 *
 * Which icon shows is not decoration. A buying store's prices are bids, not
 * asks - two of them were bidding 8,000z for Rough Oridecon on a map whose
 * cheapest ask was 18,999z - so the board is the reader's warning that a
 * number they are looking at is what somebody will pay them, not what they
 * would pay.
 *
 * `kind` is null for a shop no collector has walked past, because only the
 * sign says which way a shop trades and a search result does not carry one.
 * Null renders as "sell", which is true of all but three of the 189 shops on
 * the market map, and stops being a guess the moment anyone walks past it.
 */

const LABEL: Record<ShopKind, string> = {
  sell: "vending shop - the owner is selling",
  buy: "buying store - the owner is buying",
};

function iconUrl(kind: ShopKind): string {
  return `${import.meta.env.BASE_URL}ui/shop-${kind}.png`;
}

export function ShopSign({
  title,
  kind: rawKind = "sell",
  variant = "row",
  to,
  className = "",
}: {
  title: string | null | undefined;
  /** Null means no sign has been seen yet; almost every shop sells. */
  kind?: ShopKind | null;
  /** "row" in a list of listings, "board" as the heading over a shop. */
  variant?: "row" | "board";
  /**
   * Where the shop's own page is, if there is one to go to. In game a board
   * is the thing you click to open the shop, so a board that is only a label
   * reads as broken. Omitted where the sign already *is* the heading over
   * that shop, and where the shop has no known map to show it on.
   */
  to?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const kind: ShopKind = rawKind ?? "sell";
  const board = variant === "board";
  const px = board ? 24 : 18;

  const Tag = (to ? Link : "span") as React.ElementType;
  return (
    <Tag
      {...(to ? { to } : {})}
      title={to ? `${LABEL[kind]} - open this shop` : LABEL[kind]}
      className={
        (to ? "cursor-pointer hover:border-slate-400 hover:brightness-95 " : "") +
        "relative inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-[5px] " +
        "border border-[#c1c6c2] bg-white align-middle " +
        (board ? "px-1.5 py-1 text-sm" : "px-1 py-0.5 text-xs") +
        " " +
        className
      }
    >
      {!failed && (
        <img
          src={iconUrl(kind)}
          alt=""
          width={px}
          height={px}
          decoding="async"
          onError={() => setFailed(true)}
          // 24x24 pixel art. Smoothing it would make it look like a photo of
          // an icon rather than the icon.
          style={{ width: px, height: px, imageRendering: "pixelated" }}
          className="shrink-0"
        />
      )}
      <span
        className={
          "shop-title truncate " + (title ? "text-slate-900" : "italic text-slate-500")
        }
      >
        {title || "untitled"}
      </span>
      {board && (
        // The board's tail, pointing down at what the sign is standing over.
        <span
          aria-hidden
          className="absolute left-1/2 top-full -ml-[6px] h-0 w-0 border-x-[6px] border-t-[7px] border-x-transparent border-t-white"
        />
      )}
    </Tag>
  );
}
