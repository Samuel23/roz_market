import { Download, Map as MapIcon, Store } from "lucide-react";
import { HashRouter, NavLink, Route, Routes } from "react-router-dom";
import { Contribute } from "./pages/Contribute";
import { Home } from "./pages/Home";
import { MapPage } from "./pages/MapPage";
import { SupportPill } from "./components/SupportPill";
import { WorldPicker, WorldProvider } from "./lib/world";

// HashRouter, not BrowserRouter: GitHub Pages serves static files, so a hard
// refresh on /map would ask the server for a file that does not exist and get
// a 404. The hash never leaves the browser.
export default function App() {
  const tab = ({ isActive }: { isActive: boolean }) =>
    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition " +
    (isActive
      ? "bg-slate-800 text-slate-100"
      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200");

  return (
    <WorldProvider>
    <HashRouter>
      <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-6 p-4 pb-20 sm:p-6 sm:pb-20">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* The masthead is the way home, because everyone tries it. NavLink
              rather than a plain anchor so it stays inside the hash router
              instead of reloading the whole bundle. */}
          <NavLink
            to="/"
            end
            className="text-lg font-semibold tracking-tight text-slate-100 transition hover:text-white"
          >
            ROZ Market
          </NavLink>
          <nav className="flex gap-1">
            <NavLink to="/" end className={tab}>
              <Store className="h-4 w-4" /> Search
            </NavLink>
            <NavLink to="/map" className={tab}>
              <MapIcon className="h-4 w-4" /> Map
            </NavLink>
            {/* The index only has what somebody walked past, so the way to
                make it better belongs on the page rather than in a README
                nobody arrives at. A page here rather than a link out to
                GitHub, which is where a player who is not a developer stops
                reading - and never straight at the download, because the
                release page hands you a .exe with no explanation of what the
                box does or how to untick it. */}
            <NavLink to="/contribute" className={tab}>
              <Download className="h-4 w-4" /> Contribute
            </NavLink>
          </nav>
          <WorldPicker />
        </header>

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/contribute" element={<Contribute />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>

        <footer className="space-y-2 border-t border-slate-800 pt-3 text-xs text-slate-500">
          <p>
            Community-collected vending prices. Every listing is what a player
            walking the market last saw - not a live feed, and never complete.
            Prices carry the time they were seen; trust them accordingly.
          </p>
          <p>
            Everything here was collected by players running{" "}
            <a
              href="https://github.com/Samuel23/roz_monitor"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 underline underline-offset-2 hover:text-slate-200"
            >
              ROZ Overlay
            </a>
            , which reads your own game traffic and uploads nothing until you
            tick the box. The more people walk a market, the better this gets.
          </p>
          {/* The same notice the overlay's web portal carries. The art is not
              ours and the wording should not drift between the two. */}
          <p className="pt-1 text-slate-600">
            ROZ Market is an independent open-source companion to ROZ Monitor.
            All character, monster, item, and map graphics{" "}
            <span aria-hidden="true">&copy;</span>{" "}
            <b className="font-semibold">Gravity Co., Ltd.</b> &amp; Lee
            Myoung-Jin.
          </p>
        </footer>
        <SupportPill />
      </div>
    </HashRouter>
    </WorldProvider>
  );
}
