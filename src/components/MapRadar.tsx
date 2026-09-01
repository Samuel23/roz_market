import { MapPin } from "lucide-react";
import { hasMinimap, minimapUrl, project } from "../lib/minimap";

type Pin = {
  id: number | string;
  x: number | null;
  y: number | null;
  label?: string;
  active?: boolean;
  /** A shop someone walked past but never opened: on the map, no prices. */
  dim?: boolean;
};

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
        {placed.map(({ pin, at }) => (
          <button
            key={pin.id}
            type="button"
            onClick={onPick ? () => onPick(pin.id) : undefined}
            title={pin.label}
            aria-label={pin.label ?? `vendor at ${pin.x}, ${pin.y}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
            style={{ left: at.px, top: at.py }}
          >
            {pin.active && (
              <span className="radar-ping absolute inset-0 rounded-full bg-amber-300/70" />
            )}
            <span
              className={
                "block rounded-full ring-1 " +
                (pin.active
                  ? "h-3 w-3 bg-amber-300 ring-amber-100"
                  : pin.dim
                    ? "h-2 w-2 bg-slate-400/50 ring-slate-300/30 hover:bg-slate-300"
                    : "h-2 w-2 bg-sky-400/90 ring-sky-200/60 hover:bg-sky-300")
              }
            />
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        {map} - {placed.length} vendor{placed.length === 1 ? "" : "s"} placed
      </p>
    </div>
  );
}
