import { useEffect, useState } from "react";
import { Coffee, X } from "lucide-react";

const KOFI = "https://ko-fi.com/elijahawesam";
const DISMISSED = "roz-market:support-dismissed";

/**
 * A small ask, pinned to the corner.
 *
 * Two rules it follows, both of them about not being the thing people
 * remember the site for:
 *
 *  - It is dismissible, and the dismissal sticks. A support link that cannot
 *    be closed is an advert, and this site's whole pitch is that it is a
 *    community index rather than something being monetised at you.
 *  - It never covers content. Fixed to the bottom-right corner, and the page
 *    carries matching bottom padding so the last listing row can always be
 *    scrolled clear of it.
 *
 * localStorage can throw outright - a private window, or a browser set to
 * block site data - so every access is guarded and the failure mode is
 * "show the pill", not "blank page".
 */
export function SupportPill() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(DISMISSED) === "1");
    } catch {
      setHidden(false);
    }
  }, []);

  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISSED, "1");
    } catch {
      /* Dismissing for this view is enough; it will be back next visit. */
    }
  };

  return (
    <div className="fixed bottom-3 right-3 z-40 flex max-w-[calc(100vw-1.5rem)] items-center gap-1 rounded-full border border-slate-700 bg-slate-900/95 py-1 pl-1 pr-1 shadow-lg backdrop-blur sm:bottom-4 sm:right-4">
      <a
        href={KOFI}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800 hover:text-slate-100"
      >
        <Coffee className="h-4 w-4 shrink-0 text-amber-300/90" />
        <span className="truncate">
          <span className="font-medium text-slate-200">Support this index</span>
          <span className="hidden text-slate-500 sm:inline">
            {" "}
            - it is free and stays that way
          </span>
        </span>
      </a>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hide the support link"
        title="Hide"
        className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
