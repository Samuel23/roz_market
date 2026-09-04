import { useEffect, useRef, useState } from "react";

/**
 * A search box that adds things to a list.
 *
 * Both filter lists on this page - cards and random options - are far too
 * long to be a <select>: there are 1,400 card items and 250 option indices,
 * and scrolling a native dropdown for "Andre Card" is not searching. This is
 * the shared half: type, see what matches, pick one, and it is handed to the
 * caller, which owns the chosen list and draws it however it likes.
 */
export function Picker<T>({
  placeholder,
  search,
  render,
  keyOf,
  onPick,
  disabled,
}: {
  placeholder: string;
  /** What matches what has been typed, best first. Called on every keystroke. */
  search: (text: string) => T[];
  /** One suggestion row. */
  render: (item: T) => React.ReactNode;
  keyOf: (item: T) => string | number;
  onPick: (item: T) => void;
  /** True when the list is already as long as it can be. */
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const hits = text.trim() ? search(text) : [];

  useEffect(() => {
    function away(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  return (
    <div ref={box} className="relative">
      <input
        type="search"
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          // Enter takes the best match, so a filter can be added without
          // reaching for the mouse.
          if (e.key === "Enter" && hits.length > 0) {
            e.preventDefault();
            onPick(hits[0]);
            setText("");
            setOpen(false);
          }
        }}
        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-sky-500 disabled:opacity-40"
      />
      {open && hits.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl">
          {hits.map((item) => (
            <li key={keyOf(item)}>
              <button
                type="button"
                className="w-full px-2 py-1.5 text-left text-sm hover:bg-slate-800"
                onClick={() => {
                  onPick(item);
                  setText("");
                  setOpen(false);
                }}
              >
                {render(item)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
