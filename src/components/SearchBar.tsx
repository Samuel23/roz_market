import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Suggestion = { id: number; name: string };

// 31,000 item names is a megabyte, and it is autocomplete rather than
// content, so it is fetched the first time the box is focused instead of
// being bundled into the first paint.
let ITEMS: [number, string][] | null = null;
let loading: Promise<void> | null = null;

function loadItems() {
  if (ITEMS || loading) return loading ?? Promise.resolve();
  loading = import("../data/items.json").then((m) => {
    ITEMS = m.default as [number, string][];
  });
  return loading;
}

function suggest(text: string, limit = 8): Suggestion[] {
  if (!ITEMS || text.trim().length < 2) return [];
  const needle = text.trim().toLowerCase();
  const starts: Suggestion[] = [];
  const contains: Suggestion[] = [];
  for (const [id, name] of ITEMS) {
    const low = name.toLowerCase();
    // A name that starts with what was typed is almost always the one meant:
    // "Hood" should offer Hood before Shining Hood.
    if (low.startsWith(needle)) starts.push({ id, name });
    else if (low.includes(needle)) contains.push({ id, name });
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

export function SearchBar({
  value,
  onChange,
  onPickItem,
}: {
  value: string;
  onChange: (v: string) => void;
  onPickItem: (id: number, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(Boolean(ITEMS));
  const [hits, setHits] = useState<Suggestion[]>([]);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHits(ready ? suggest(value) : []);
  }, [value, ready]);

  useEffect(() => {
    function away(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  return (
    <div ref={box} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        type="search"
        value={value}
        placeholder="Search an item or a shop name..."
        aria-label="Search the market"
        onFocus={() => {
          setOpen(true);
          void loadItems().then(() => setReady(true));
        }}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className="w-full rounded-lg border border-slate-700 bg-slate-900/70 py-2.5 pl-9 pr-9 text-sm outline-none placeholder:text-slate-500 focus:border-sky-500"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {open && hits.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl">
          {hits.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left text-sm hover:bg-slate-800"
                onClick={() => {
                  onPickItem(s.id, s.name);
                  setOpen(false);
                }}
              >
                <span>{s.name}</span>
                <span className="font-mono text-[11px] text-slate-500">{s.id}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
