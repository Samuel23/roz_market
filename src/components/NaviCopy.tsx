import { useEffect, useRef, useState } from "react";
import { Check, MapPin } from "lucide-react";

/**
 * A shop's position, as the command that walks you there.
 *
 * The client has a navigation system, and its chat command takes the map's
 * technical name and the coordinates separated by a slash:
 *
 *     /navi prt_mk_g1 174/137
 *
 * The slash is not optional and a comma is not accepted, which is why the
 * label here reads "174/137" rather than the "174,137" it used to - what is
 * shown is exactly what is copied, so nobody has to translate it by eye.
 *
 * Copying rather than linking, because a web page cannot hand text to the
 * game; the paste is the handoff.
 */

export function naviCommand(map: string, x: number, y: number): string {
  return `/navi ${map} ${x}/${y}`;
}

async function copyText(text: string): Promise<boolean> {
  // The async clipboard needs a secure context. The page is served over
  // HTTPS, but a contributor running the site from a file:// copy or a plain
  // http:// host is exactly the sort of person likely to try this.
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Denied by permissions policy, or no clipboard at all. Fall through.
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function NaviCopy({
  map,
  x,
  y,
  className = "",
}: {
  map: string;
  x: number;
  y: number;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  const timer = useRef<number | undefined>(undefined);
  const cmd = naviCommand(map, x, y);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // A failed copy leaves the command on screen instead of claiming success:
  // one click selects the whole thing, so it is still one Ctrl+C away.
  if (state === "fail") {
    return (
      <span
        className={"inline-flex items-center gap-1 font-mono text-amber-200/90 " + className}
        style={{ userSelect: "all" }}
        title="Could not reach the clipboard - select this and copy it"
      >
        {cmd}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await copyText(cmd);
        setState(ok ? "ok" : "fail");
        if (ok) {
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setState("idle"), 1400);
        }
      }}
      title={`Copy "${cmd}" to paste in game`}
      className={
        "inline-flex items-center gap-1 rounded px-1 -mx-1 transition " +
        "hover:bg-slate-700/60 hover:text-slate-200 " +
        (state === "ok" ? "text-emerald-300 " : "") +
        className
      }
    >
      {state === "ok" ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <MapPin className="h-3.5 w-3.5" />
      )}
      {state === "ok" ? "/navi copied" : `${map} ${x}/${y}`}
    </button>
  );
}
