import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import slots from "../data/slots.json";
import { itemLabel } from "../lib/format";
import {
  searchCards,
  searchOptions,
  type CardEntry,
  type OptionEntry,
} from "../lib/catalog";

// Only slotted items are in here, so a miss means "no slots", not
// "unknown". Already loaded for the listing rows, so it costs nothing here.
const SLOTS = slots as Record<string, number>;

type Suggestion = { id: number; name: string };

// 31,000 item names is a megabyte, and it is autocomplete rather than
// content, so it is fetched the first time the box is focused instead of
// being bundled into the first paint.
let ITEMS: [number, string][] | null = null;
// The same names lower-cased, once, because the alternative is 31,000
// toLowerCase calls on every keystroke - and matching has to look at all of
// them now that a later item can outrank an earlier one.
let LOWER: string[] = [];
let loading: Promise<void> | null = null;

function loadItems() {
  if (ITEMS || loading) return loading ?? Promise.resolve();
  loading = import("../data/items.json").then((m) => {
    ITEMS = m.default as [number, string][];
    LOWER = ITEMS.map(([, name]) => name.toLowerCase());
  });
  return loading;
}

/** All digits, so it is an item id and not a name. Exported because the page
 *  has to make the same call when it decides what to send. */
export function looksLikeId(text: string): boolean {
  return /^\d+$/.test(text.trim());
}

function suggest(text: string, limit = 8): Suggestion[] {
  if (!ITEMS) return [];
  const needle = text.trim().toLowerCase();

  // An id, typed out. Ids are how the item tables, the wiki and MidgardHub
  // all refer to an item, so somebody pasting 700084 means that item and
  // nothing else - a name search for "700084" would answer nothing at all.
  // The exact id first, then the ones it is a prefix of, so a partial id
  // still narrows while it is being typed.
  if (looksLikeId(needle)) {
    const want = Number(needle);
    const exact: Suggestion[] = [];
    const prefixed: Suggestion[] = [];
    for (const [id, name] of ITEMS) {
      if (id === want) exact.push({ id, name });
      else if (String(id).startsWith(needle)) prefixed.push({ id, name });
      if (prefixed.length >= limit) break;
    }
    return [...exact, ...prefixed].slice(0, limit);
  }

  if (needle.length < 2) return [];

  // Three tiers, and the whole table is read before any of them is trusted.
  //
  // An item named exactly what was typed outranks one that merely begins with
  // it, and that is not a nicety: five different items are called "Chain", and
  // they are scattered through the table by id - 1519, 1520, 1521, 590071,
  // 590075 - with twenty Chain Mails and Chain Shadow Weapons in between. A
  // scan that stopped at the first six "starts with" hits answered "Chain"
  // with three Chains and three Chain Mails and never reached the other two
  // Chains at all. Stopping early is only safe once the list is full of exact
  // matches, because nothing can outrank those.
  const exact: Suggestion[] = [];
  const starts: Suggestion[] = [];
  const contains: Suggestion[] = [];
  for (let i = 0; i < ITEMS.length; i++) {
    const low = LOWER[i];
    if (low === needle) exact.push({ id: ITEMS[i][0], name: ITEMS[i][1] });
    else if (low.startsWith(needle)) starts.push({ id: ITEMS[i][0], name: ITEMS[i][1] });
    else if (low.includes(needle)) contains.push({ id: ITEMS[i][0], name: ITEMS[i][1] });
    if (exact.length >= limit) break;
  }
  return [...exact, ...starts, ...contains].slice(0, limit);
}

function Head({ children }: { children: React.ReactNode }) {
  return (
    <li className="px-3 pb-0.5 pt-2 text-[10px] uppercase tracking-wide text-slate-500">
      {children}
    </li>
  );
}

/**
 * The one box, searching everything a listing can be looked up by.
 *
 * An item by name is the obvious one, and by its id for anyone who has the
 * number in front of them - from the client's tables, a wiki, or MidgardHub,
 * which keys items by the same ids the game sends us. The other two are what
 * an item *has*:
 * a card socketed in it and a random option rolled on it, neither of which is
 * anywhere in the item's name. They are offered here rather than left to the
 * filter panel because that is where a player types "hurricane" first, and
 * because the affix - the word a card splices into the name - is the only
 * name most players know a card by.
 */
export function SearchBar({
  value,
  onChange,
  onPickItem,
  onPickCard,
  onPickOption,
}: {
  value: string;
  onChange: (v: string) => void;
  onPickItem: (id: number, name: string) => void;
  onPickCard: (id: number) => void;
  onPickOption: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(Boolean(ITEMS));
  const [hits, setHits] = useState<Suggestion[]>([]);
  const [cards, setCards] = useState<CardEntry[]>([]);
  const [opts, setOpts] = useState<OptionEntry[]>([]);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHits(ready ? suggest(value) : []);
    // Cards and options are bundled with the page, so they answer while the
    // item names are still downloading.
    setCards(searchCards(value, 4));
    setOpts(searchOptions(value, 4));
  }, [value, ready]);

  useEffect(() => {
    function away(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  const any = hits.length + cards.length + opts.length > 0;

  return (
    <div ref={box} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        type="search"
        value={value}
        placeholder="Search an item or its ID, a card, an option, or a shop name..."
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

      {open && any && (
        <ul className="absolute z-20 mt-1 max-h-96 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl">
          {hits.length > 0 && <Head>Items</Head>}
          {hits.map((s) => (
            <li key={`i${s.id}`}>
              <button
                type="button"
                className="flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left text-sm hover:bg-slate-800"
                onClick={() => {
                  onPickItem(s.id, s.name);
                  setOpen(false);
                }}
              >
                <span>{itemLabel(s.name, 0, SLOTS[s.id])}</span>
                <span className="font-mono text-[11px] text-slate-500">{s.id}</span>
              </button>
            </li>
          ))}

          {cards.length > 0 && <Head>Socketed cards</Head>}
          {cards.map((c) => (
            <li key={`c${c.id}`}>
              <button
                type="button"
                className="flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left text-sm hover:bg-slate-800"
                onClick={() => {
                  onPickCard(c.id);
                  setOpen(false);
                }}
              >
                <span className="text-indigo-200">{c.name}</span>
                {c.affix && (
                  <span className="text-[11px] text-slate-500">
                    {c.behind ? "... " + c.affix : c.affix + " ..."}
                  </span>
                )}
              </button>
            </li>
          ))}

          {opts.length > 0 && <Head>Random options</Head>}
          {opts.map((o) => (
            <li key={`o${o.index}`}>
              <button
                type="button"
                className="w-full px-3 py-1.5 text-left text-sm text-emerald-200 hover:bg-slate-800"
                onClick={() => {
                  onPickOption(o.index);
                  setOpen(false);
                }}
              >
                {/* The client's own wording, N and all: "ATK +N" is how an
                    option is written in a tooltip, and the N is exactly what
                    this filter leaves open until the panel narrows it. */}
                {o.template}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
