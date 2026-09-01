import { Map as MapIcon, Store } from "lucide-react";
import { HashRouter, NavLink, Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home";
import { MapPage } from "./pages/MapPage";

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
    <HashRouter>
      <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-6 p-4 sm:p-6">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-lg font-semibold tracking-tight text-slate-100">
            ROZ Market
          </h1>
          <nav className="flex gap-1">
            <NavLink to="/" end className={tab}>
              <Store className="h-4 w-4" /> Search
            </NavLink>
            <NavLink to="/map" className={tab}>
              <MapIcon className="h-4 w-4" /> Map
            </NavLink>
          </nav>
        </header>

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>

        <footer className="border-t border-slate-800 pt-3 text-xs text-slate-500">
          Community-collected vending prices. Every listing is what a player
          walking the market last saw - not a live feed, and never complete.
          Prices carry the time they were seen; trust them accordingly.
        </footer>
      </div>
    </HashRouter>
  );
}
