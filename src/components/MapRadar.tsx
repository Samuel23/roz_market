import { MapPin } from "lucide-react";
import { hasMinimap, minimapUrl, project } from "../lib/minimap";
import { shopIconUrl } from "../lib/shop";
import type { ShopKind } from "../lib/api";

type Pin = {
  id: number | string;
  x: number | null;
  y: number | null;
  label?: string;
  active?: boolean;
  /** A shop someone walked past but never opened: on the map, no prices. */
  dim?: boolean;
  /** Which board the shop flies, so the pin is the icon the game draws. */
  kind?: ShopKind | null;
};

// Small enough that a market's worth of them is still a map. The market map
// packs ~190 shops into a few dozen cells, so they overlap however they are
// drawn; the ones worth looking at are lifted above the rest by z-index
// rather than by size.
const PIN = 15;
const PIN_ACTIVE = 22;

/**
 * The client's own minimap with vendors pinned on it.
 *
 * The point of this screen is walking to a shop, so the pin has to be where
 * the shop is - see lib/minimap.ts for why that is not a plain scale. The
 * coordinate is also printed as text under the map, because a player who
 * cannot see the pin can still type /where and compare numbers.
 */
export function MapRadar({
  map,
  pins,
  size = 320,
  onPick,
}: {
  map: string | null | undefined;
  pins: Pin[];
  size?: number;
  onPick?: (id: number | string) => void;
}) {
  if (!map || !hasMinimap(map)) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-sm text-slate-400"
        style={{ minHeight: size }}
      >
        <MapPin className="h-5 w-5" />
        <p>No minimap for {map ?? "this map"}.</p>
        <p className="text-xs text-slate-500">
          The coordinates below still work in game.
        </p>
      </div>
    );
  }

  const placed = pins
    .map((p) => ({ pin: p, at: project(map, p.x, p.y, size) }))
    .filter((p): p is { pin: Pin; at: { px: number; py: number } } => !!p.at);

  return (
    <div className="space-y-2">
      <div
        className="relative overflow-hidden rounded-lg border border-slate-700 bg-slate-950"
        style={{ width: size, height: size }}
      >
        <img
          src={minimapUrl(map)}
          alt={`${map} minimap`}
          width={size}
          height={size}
          className="absolute inset-0 h-full w-full object-cover opacity-80"
          draggable={false}
        />
        {placed.map(({ pin, at }) => {
          const px = pin.active ? PIN_ACTIVE : PIN;
          return (
            <button
              key={pin.id}
              type="button"
              onClick={onPick ? () => onPick(pin.id) : undefined}
              title={pin.label}
              aria-label={pin.label ?? `vendor at ${pin.x}, ${pin.y}`}
              // Stacking order as classes rather than inline, so hover can
              // beat it: this map puts ~190 shops inside eighty pixels, and
              // they overlap at any icon size. The one you picked sits on
              // top, then shops with prices, then the ones nobody has opened -
              // and whichever you point at comes to the front so it can be
              // picked out of the crowd.
              className={
                "absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:z-[5] " +
                (pin.active ? "z-[3]" : pin.dim ? "z-[1]" : "z-[2]")
              }
              style={{ left: at.px, top: at.py }}
            >
              {pin.active && (
                <span className="radar-ping absolute inset-0 rounded-full bg-amber-300/70" />
              )}
              <img
                src={shopIconUrl(pin.kind)}
                alt=""
                width={px}
                height={px}
                draggable={false}
                className={
                  "relative block transition " +
                  (pin.dim
                    ? "opacity-40 saturate-50 hover:opacity-100 hover:saturate-100"
                    : "opacity-95 hover:opacity-100")
                }
                style={{
                  width: px,
                  height: px,
                  imageRendering: "pixelated",
                  // A dark minimap swallows a small sprite; the outline is
                  // what keeps it readable over grass as well as stone.
                  filter:
                    "drop-shadow(0 0 1px rgba(0,0,0,.9))" +
                    (pin.active ? " drop-shadow(0 0 4px rgb(253 230 138))" : ""),
                }}
              />
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        {map} - {placed.length} vendor{placed.length === 1 ? "" : "s"} placed
      </p>
    </div>
  );
}
