import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { configured, listWorlds, type World } from "./api";

/**
 * Which server the whole page is looking at.
 *
 * ROZ runs three worlds - Skadi in the EU, Odin and Loki in SEA - and they are
 * three separate economies that share nothing but an item table. A price from
 * one says nothing about the others, so this is not a filter that narrows a
 * result set; it is the scope everything on the page is drawn in. Hence a
 * context rather than a prop: search, the map and the price chart must never
 * disagree about which world they are showing.
 *
 * The choice is remembered per browser, because a player has one server and
 * picking it on every visit would be a small daily insult.
 */

const KEY = "roz_market.world";

type Ctx = {
  world: string;
  setWorld: (w: string) => void;
  worlds: World[];
  label: (w?: string) => string;
};

const WorldContext = createContext<Ctx>({
  world: "skadi",
  setWorld: () => {},
  worlds: [],
  label: (w) => w ?? "",
});

function remembered(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    // A private window, or site data blocked. Not remembering is fine;
    // throwing on the way to first paint is not.
    return null;
  }
}

export function WorldProvider({ children }: { children: React.ReactNode }) {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [world, setWorldState] = useState<string>(() => remembered() ?? "skadi");

  useEffect(() => {
    if (!configured) return;
    const ac = new AbortController();
    listWorlds(ac.signal)
      .then((ws) => {
        setWorlds(ws);
        // A remembered world that no longer exists would silently show an
        // empty page forever. Fall back to the first the server offers.
        if (ws.length && !ws.some((w) => w.world === world)) {
          setWorldState(ws[0].world);
        }
      })
      .catch(() => {});
    return () => ac.abort();
    // Deliberately once: the list does not change while the page is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      world,
      worlds,
      setWorld: (w: string) => {
        setWorldState(w);
        try {
          localStorage.setItem(KEY, w);
        } catch {
          /* not remembering is not a failure */
        }
      },
      label: (w) =>
        worlds.find((x) => x.world === (w ?? world))?.label ?? (w ?? world),
    }),
    [world, worlds],
  );

  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>;
}

export function useWorld() {
  return useContext(WorldContext);
}

/** The picker itself, in the header where the page's scope belongs. */
export function WorldPicker() {
  const { world, setWorld, worlds } = useWorld();
  if (worlds.length < 2) return null;
  return (
    <label className="ml-auto inline-flex items-center gap-2 text-xs text-slate-400">
      <span className="hidden sm:inline">Server</span>
      <select
        value={world}
        onChange={(e) => setWorld(e.target.value)}
        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-200 outline-none focus:border-slate-500"
      >
        {worlds.map((w) => (
          <option key={w.world} value={w.world}>
            {w.label}
          </option>
        ))}
      </select>
    </label>
  );
}
