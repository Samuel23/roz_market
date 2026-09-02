import { useEffect, useRef, useState } from "react";
import { searchMarket, configured, type Listing, type Query } from "../lib/api";
import { useWorld } from "../lib/world";
import { Filters } from "../components/Filters";
import { ItemModal } from "../components/ItemModal";
import { ListingRow } from "../components/ListingRow";
import { SearchBar } from "../components/SearchBar";

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
  const timer = useRef<number | undefined>(undefined);

  // Typing is debounced rather than fired per keystroke: the API is a real
  // database query behind a rate-limited function, and "Hood" would otherwise
  // send four of them, three of which are already stale on arrival.
  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setQuery((q) => ({ ...q, q: text.trim() || undefined, item_id: undefined, offset: 0 }));
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
          setText(name);
          // An id is exact where the text is not: picking "Hood" from the list
          // means that item, not everything with "hood" in the name.
          setQuery((q) => ({ ...q, q: undefined, item_id: id, offset: 0 }));
        }}
      />
      <Filters query={query} onChange={patch} />

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
