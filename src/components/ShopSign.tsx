import { useState } from "react";

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
 * Everything in this index is a vending shop, because every path that creates
 * a vendor row starts at a vending packet - the 0x0131 sign, the 0x0b3d and
 * 0x0b62 stock lists, the 0x0b64 search answer. Buying stores announce
 * themselves on 0x0814 and are not collected, so `kind` defaults to "sell"
 * from fact rather than from assumption, and the other icon is here ready for
 * the day they are.
 */

export type ShopKind = "sell" | "buy";

const LABEL: Record<ShopKind, string> = {
  sell: "vending shop - the owner is selling",
  buy: "buying store - the owner is buying",
};

function iconUrl(kind: ShopKind): string {
  return `${import.meta.env.BASE_URL}ui/shop-${kind}.png`;
}

export function ShopSign({
  title,
  kind = "sell",
  variant = "row",
  className = "",
}: {
  title: string | null | undefined;
  kind?: ShopKind;
  /** "row" in a list of listings, "board" as the heading over a shop. */
  variant?: "row" | "board";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const board = variant === "board";
  const px = board ? 24 : 18;

  return (
    <span
      title={LABEL[kind]}
      className={
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
    </span>
  );
}
