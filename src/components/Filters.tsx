import { SlidersHorizontal, X } from "lucide-react";
import type { Query } from "../lib/api";
import maps from "../data/maps.json";
import {
  cardName,
  optionLabel,
  searchCards,
  searchOptions,
  type CardEntry,
  type OptionEntry,
} from "../lib/catalog";
import { Picker } from "./Picker";

const MAPS = Object.keys(maps as Record<string, unknown>).sort();

const SORTS: [NonNullable<Query["sort"]>, string][] = [
  ["price_asc", "Cheapest first"],
  ["price_desc", "Most expensive"],
  ["time_desc", "Most recent"],
];

/** Four sockets is the most any item has, and five options the most the wire
 *  carries, so asking for more can only ever match nothing. */
const MAX_CARDS = 4;
const MAX_OPTIONS = 5;

export function Filters({
  query,
  onChange,
  open,
  onOpenChange,
}: {
  query: Query;
  onChange: (patch: Partial<Query>) => void;
  /**
   * Whether the panel is unfolded.
   *
   * Controlled from the page rather than kept here, because a card or an
   * option picked in the search box lands in this panel: folded up, all the
   * player would see of it is a count going up, which looks like the search
   * did nothing.
   */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const cardIds = query.card_ids ?? [];
  const optIds = query.opt_ids ?? [];
  const optMin = query.opt_min ?? [];
  const active =
    (query.refine ? 1 : 0) +
    cardIds.length +
    optIds.length +
    (query.map ? 1 : 0) +
    (query.min_price || query.max_price ? 1 : 0);

  function addCard(entry: CardEntry) {
    if (cardIds.includes(entry.id) || cardIds.length >= MAX_CARDS) return;
    onChange({ card_ids: [...cardIds, entry.id] });
  }

  function dropCard(id: number) {
    const left = cardIds.filter((c) => c !== id);
    onChange({ card_ids: left.length ? left : undefined });
  }

  function addOption(entry: OptionEntry) {
    if (optIds.includes(entry.index) || optIds.length >= MAX_OPTIONS) return;
    onChange({ opt_ids: [...optIds, entry.index], opt_min: [...optMin, 0] });
  }

  // The floors are positional against the ids, so an option can only ever be
  // removed from both lists at once - dropping it from one and not the other
  // shifts every floor after it onto the wrong option.
  function dropOption(at: number) {
    const ids = optIds.filter((_, i) => i !== at);
    const mins = optMin.filter((_, i) => i !== at);
    onChange({
      opt_ids: ids.length ? ids : undefined,
      opt_min: ids.length ? mins : undefined,
    });
  }

  function setMin(at: number, value: number) {
    onChange({ opt_min: optIds.map((_, i) => (i === at ? value : optMin[i] ?? 0)) });
  }

  return (
    <div className="rounded-lg border border-slate-700/70 bg-slate-900/40">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300"
        aria-expanded={open}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
        {active > 0 && (
          <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[11px] text-sky-200">
            {active}
          </span>
        )}
        <span className="ml-auto text-xs text-slate-500">{open ? "hide" : "show"}</span>
      </button>

      {open && (
        <div className="grid gap-4 border-t border-slate-700/70 p-3 sm:grid-cols-2">
          <label className="text-xs text-slate-400">
            Minimum refine: <span className="text-slate-200">+{query.refine ?? 0}</span>
            <input
              type="range"
              min={0}
              max={10}
              value={query.refine ?? 0}
              onChange={(e) => onChange({ refine: Number(e.target.value) || undefined })}
              className="mt-1 w-full accent-sky-500"
            />
          </label>

          <label className="text-xs text-slate-400">
            Sort
            <select
              value={query.sort ?? "price_asc"}
              onChange={(e) => onChange({ sort: e.target.value as Query["sort"] })}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200"
            >
              {SORTS.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          {/*
            Cards socketed. Every card named has to be in the item, so a
            second one narrows rather than widens - which is how an item with
            four sockets is actually shopped for. Searchable by the card's own
            name and by the word it splices into the item's name, so
            "Hurricane" finds the Andre Card for a player who has only ever
            seen it inside a bow.
          */}
          <div className="text-xs text-slate-400 sm:col-span-2">
            Cards socketed
            {cardIds.length > 0 && (
              <div className="mb-1 mt-1 flex flex-wrap gap-1">
                {cardIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded bg-indigo-500/15 px-1.5 py-0.5 text-[11px] text-indigo-200"
                  >
                    {cardName(id)}
                    <button
                      type="button"
                      aria-label={`Remove ${cardName(id)}`}
                      onClick={() => dropCard(id)}
                      className="text-indigo-300/70 hover:text-indigo-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="mt-1">
              <Picker<CardEntry>
                placeholder={
                  cardIds.length >= MAX_CARDS
                    ? "four sockets is the most an item has"
                    : "Card name, or the word it adds (Hurricane)"
                }
                disabled={cardIds.length >= MAX_CARDS}
                search={(t) => searchCards(t).filter((c) => !cardIds.includes(c.id))}
                keyOf={(c) => c.id}
                onPick={addCard}
                render={(c) => (
                  <span className="flex items-baseline justify-between gap-3">
                    <span>{c.name}</span>
                    {c.affix && (
                      <span className="text-[11px] text-slate-500">
                        {c.behind ? "... " + c.affix : c.affix + " ..."}
                      </span>
                    )}
                  </span>
                )}
              />
            </div>
          </div>

          {/*
            Random options, each with a floor. The index says what the option
            is and the value says whether it is worth buying - ATK +3 and
            ATK +30 are the same index - so every chosen option carries a
            minimum, and 0 means any roll.
          */}
          <div className="text-xs text-slate-400 sm:col-span-2">
            Random options
            {optIds.length > 0 && (
              <div className="mb-1 mt-1 flex flex-col gap-1">
                {optIds.map((index, at) => (
                  <div key={`${index}-${at}`} className="flex items-center gap-2">
                    <span className="flex-1 rounded bg-emerald-500/10 px-1.5 py-1 text-[11px] text-emerald-200">
                      {optionLabel(index, optMin[at] ?? 0)}
                    </span>
                    <label className="flex items-center gap-1 text-[11px] text-slate-500">
                      at least
                      <input
                        type="number"
                        min={0}
                        value={optMin[at] || ""}
                        placeholder="any"
                        aria-label={`Minimum roll for ${optionLabel(index)}`}
                        onChange={(e) => setMin(at, Math.max(0, Number(e.target.value) || 0))}
                        className="w-16 rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-slate-200"
                      />
                    </label>
                    <button
                      type="button"
                      aria-label={`Remove ${optionLabel(index)}`}
                      onClick={() => dropOption(at)}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-1">
              <Picker<OptionEntry>
                placeholder={
                  optIds.length >= MAX_OPTIONS
                    ? "five options is the most an item carries"
                    : "Option wording (ATK, Perfect Dodge, Water...)"
                }
                disabled={optIds.length >= MAX_OPTIONS}
                search={(t) => searchOptions(t).filter((o) => !optIds.includes(o.index))}
                keyOf={(o) => o.index}
                onPick={addOption}
                render={(o) => o.template}
              />
            </div>
          </div>

          <label className="text-xs text-slate-400">
            Map
            <select
              value={query.map ?? ""}
              onChange={(e) => onChange({ map: e.target.value || undefined })}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200"
            >
              <option value="">anywhere</option>
              {MAPS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <div className="text-xs text-slate-400">
            Price range
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min={0}
                placeholder="min"
                value={query.min_price ?? ""}
                onChange={(e) => onChange({ min_price: Number(e.target.value) || undefined })}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200"
              />
              <span className="text-slate-600">-</span>
              <input
                type="number"
                min={0}
                placeholder="max"
                value={query.max_price ?? ""}
                onChange={(e) => onChange({ max_price: Number(e.target.value) || undefined })}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200"
              />
            </div>
          </div>

          {active > 0 && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  refine: undefined,
                  card_ids: undefined,
                  opt_ids: undefined,
                  opt_min: undefined,
                  map: undefined,
                  min_price: undefined,
                  max_price: undefined,
                })
              }
              className="justify-self-start rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
