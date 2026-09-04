import { useEffect, useRef, useState } from "react";
import { searchMarket, configured, type Listing, type Query } from "../lib/api";
import { useWorld } from "../lib/world";
import { Filters } from "../components/Filters";
import { ItemModal } from "../components/ItemModal";
import { ListingRow } from "../components/ListingRow";
import { SearchBar, looksLikeId } from "../components/SearchBar";

const PAGE = 50;

export function Home() {
  const { world } = useWorld();
  const [text, setText] = useState("");
  const [query, setQuery] = useState<Query>({ sort: "price_asc", limit: PAGE });
  const [rows, setRows] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Listing | null>(null);
  // The filter panel's fold, owned here because the search box can put
  // something into it: a card or an option picked from the suggestions lands
  // as a chip in a panel the player may have folded away.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  // The item a suggestion was picked for, and the text that was put in the box
  // to show for it.
  //
  // Without this the pick does not survive: choosing "Hood" fills the box with
  // "Hood", the box changing runs the debounce below, and 250ms later the
  // exact item_id has been replaced by a name search for "hood" - which also
  // returns Shining Hood and Hood of Judgement. The pick is honoured for as
  // long as the text is still the one it put there.
  const picked = useRef<{ text: string; id: number } | null>(null);

  // Typing is debounced rather than fired per keystroke: the API is a real
  // database query behind a rate-limited function, and "Hood" would otherwise
  // send four of them, three of which are already stale on arrival.
  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const raw = text.trim();
      const pick = picked.current && picked.current.text === raw ? picked.current.id : null;
      // All digits is an item id, not a name. Ids are how the client tables,
      // the wiki and MidgardHub all name an item, so somebody who has one in
      // front of them can paste it - and a name search for "700084" would
      // answer nothing, since no item name contains it.
      const asId = pick ?? (looksLikeId(raw) ? Number(raw) : null);
      setQuery((q) => ({
        ...q,
        q: asId === null ? raw || undefined : undefined,
        item_id: asId ?? undefined,
        offset: 0,
      }));
    }, 250);
    return () => window.clearTimeout(timer.current);
  }, [text]);

  useEffect(() => {
    if (!configured) return;
    const stop = new AbortController();
    setBusy(true);
    setError(null);
    searchMarket({ ...query, world }, stop.signal)
      .then((res) => {
        setRows(res.rows);
        setTotal(res.total);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => setBusy(false));
    return () => stop.abort();
    // world is part of the query in every practical sense: changing server
    // must refetch, not filter what is already on screen.
  }, [query, world]);

  if (!configured) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-amber-500/40 bg-amber-500/5 p-6 text-sm">
        <h2 className="mb-2 font-medium text-amber-200">Not connected yet</h2>
        <p className="text-slate-300">
          Set <code className="text-amber-200">VITE_SUPABASE_URL</code> and{" "}
          <code className="text-amber-200">VITE_SUPABASE_ANON_KEY</code> - in{" "}
          <code>.env.local</code> for local development, or as repository
          secrets for the Pages build. See <code>.env.example</code>.
        </p>
      </div>
    );
  }

  const patch = (p: Partial<Query>) => setQuery((q) => ({ ...q, ...p, offset: 0 }));
  const page = Math.floor((query.offset ?? 0) / PAGE) + 1;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="space-y-4">
      <SearchBar
        value={text}
        onChange={setText}
        onPickItem={(id, name) => {
          // An id is exact where the text is not: picking "Hood" from the list
          // means that item, not everything with "hood" in the name. Recorded
          // as well as applied, so the debounce above leaves it alone.
          picked.current = { text: name, id };
          setText(name);
          setQuery((q) => ({ ...q, q: undefined, item_id: id, offset: 0 }));
        }}
        // A card or an option is a filter, not a search term - and the term
        // has to go, or "hurricane" stays on as a name filter that no item
        // name matches and the page answers nothing.
        onPickCard={(id) => {
          setText("");
          setFiltersOpen(true);
          setQuery((q) => {
            const held = q.card_ids ?? [];
            if (held.includes(id) || held.length >= 4) return q;
            return { ...q, q: undefined, card_ids: [...held, id], offset: 0 };
          });
        }}
        onPickOption={(index) => {
          setText("");
          setFiltersOpen(true);
          setQuery((q) => {
            const held = q.opt_ids ?? [];
            if (held.includes(index) || held.length >= 5) return q;
            return {
              ...q,
              q: undefined,
              opt_ids: [...held, index],
              // Any roll, until the panel is used to say otherwise. The floors
              // are positional, so one is added here or every later one lands
              // against the wrong option.
              opt_min: [...(q.opt_min ?? []), 0],
              offset: 0,
            };
          });
        }}
      />
      <Filters
        query={query}
        onChange={patch}
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
      />

      <div className="flex items-baseline justify-between text-sm text-slate-400">
        <span>
          {busy ? "Searching..." : `${total.toLocaleString("en-US")} listing${total === 1 ? "" : "s"}`}
        </span>
        {pages > 1 && (
          <span>
            page {page} of {pages}
          </span>
        )}
      </div>

      {error && (
        <p className="rounded border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {!busy && rows.length === 0 && !error && (
        <p className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
          Nothing matches yet. Either no collector has walked past one, or it is
          genuinely not for sale right now.
        </p>
      )}

      <div className="space-y-2">
        {rows.map((l) => (
          <ListingRow key={l.listing_id} listing={l} onOpen={setOpen} />
        ))}
      </div>

      {pages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setQuery((q) => ({ ...q, offset: Math.max(0, (q.offset ?? 0) - PAGE) }))}
            className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-300 disabled:opacity-40 hover:enabled:border-slate-500"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => setQuery((q) => ({ ...q, offset: (q.offset ?? 0) + PAGE }))}
            className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-300 disabled:opacity-40 hover:enabled:border-slate-500"
          >
            Next
          </button>
        </div>
      )}

      {open && <ItemModal listing={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
