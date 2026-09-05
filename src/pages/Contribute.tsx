import {
  Check,
  Download,
  ExternalLink,
  Footprints,
  MousePointerClick,
  Scroll,
  Shield,
  X,
} from "lucide-react";

/**
 * Where prices come from, and how to add yours.
 *
 * On the site rather than in a README, because the people this has to convince
 * are players, not developers - and a GitHub markdown file is where they stop
 * reading. Everything a stranger needs in order to decide is on this page; the
 * links out are for the ones who want the detail, not for the ones who need
 * the basics.
 */

const RELEASE = "https://github.com/Samuel23/roz_monitor/releases/latest";
const GUIDE =
  "https://github.com/Samuel23/roz_monitor/blob/main/MARKET_CONTRIBUTING.md";
const SAFETY =
  "https://github.com/Samuel23/roz_monitor#-security--integrity-verification";

const SENT = [
  "The shop's sign - its title and its owner's name",
  "Which map it is on, and the tile it is standing on",
  "Items, prices, quantities, refine, cards and random options",
  "Whether it is a selling shop or a buying store",
  "A Store Assistant's rental countdown",
  "A random 16-character token, so two people seeing one price can be told from one person seeing it twice",
];

const NEVER = [
  "Your character name, account, login or e-mail",
  "Your position, level, HP or zeny",
  "Your inventory, cart or storage",
  "Your chat, whispers or party",
  "Anything you type, and anything you buy",
];

const WAYS: [typeof Footprints, string, string][] = [
  [
    MousePointerClick,
    "Opening a shop",
    "The whole cart, every item and price - and the only thing that can ever tell the index an item has sold. You do not have to buy anything.",
  ],
  [
    Footprints,
    "Walking past",
    "Every sign that comes into view is placed on the map: shop, owner, exact tile. No clicking. A sign advertises a title, though, not a cart - so this maps the market without pricing it.",
  ],
  [
    Scroll,
    "Using a Vending Search Scroll",
    "Every row you get back is a real price from a shop you never had to visit. Search rows carry no coordinates, so those shops show a price until somebody walks past them.",
  ],
];

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-700/70 bg-slate-900/40 p-4 sm:p-5">
      {children}
    </section>
  );
}

export function Contribute() {
  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-xl font-semibold text-slate-100">
          Every price here was seen by a player
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
          There is no bot and no scraper behind this site. Each listing is here
          because somebody walked past that shop with{" "}
          <span className="text-slate-100">ROZ Overlay</span> running, so the
          index is only ever as good as the number of people walking markets.
          If a map looks empty, it is not that nothing is for sale there - it is
          that nobody has been.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a
            href={RELEASE}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-sky-500/90 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400"
          >
            <Download className="h-4 w-4" /> Download the overlay
          </a>
          <a
            href={GUIDE}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-200"
          >
            The full guide <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Windows only. No installer, no account, no e-mail, no key.
        </p>
      </Card>

      <Card>
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
          Three steps, once
        </h2>
        <ol className="mt-3 space-y-3 text-sm text-slate-300">
          {[
            "Unzip it anywhere and run ROZ_Overlay.exe. Start the game as usual - the order does not matter.",
            'Open the Setup tab and tick "Contribute anonymous market prices to community index". It is off until you do.',
            "Play. What you see while shopping is uploaded in the background, and the Setup tab keeps a running count of it.",
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-slate-800 text-[11px] font-medium text-sky-300">
                {i + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-slate-500">
          Untick the same box to stop. Collection ends on the spot and anything
          queued is thrown away rather than sent.
        </p>
      </Card>

      {/*
        The two columns are the whole trust argument, and they are the reason
        this page exists at all: "anonymous" is a claim, and a list of what
        does and does not leave the PC is a fact somebody can check.
      */}
      <Card>
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
          What is sent, and what is not
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Only what a shop broadcasts to everyone standing on that map. If your
          character can see it by walking up, so can the index; if it cannot,
          the index never receives it.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-emerald-300">
              <Check className="h-4 w-4" /> Sent
            </div>
            <ul className="space-y-1.5 text-sm text-slate-300">
              {SENT.map((line) => (
                <li key={line} className="leading-relaxed">
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-rose-300">
              <X className="h-4 w-4" /> Never sent
            </div>
            <ul className="space-y-1.5 text-sm text-slate-300">
              {NEVER.map((line) => (
                <li key={line} className="leading-relaxed">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
          What helps most
        </h2>
        <div className="mt-3 space-y-3">
          {WAYS.map(([Icon, title, body]) => (
            <div key={title} className="flex gap-3">
              <Icon className="mt-0.5 h-4 w-4 flex-none text-sky-300" />
              <p className="text-sm leading-relaxed text-slate-300">
                <span className="text-slate-100">{title}.</span> {body}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          If you are going to do one deliberate thing: walk a market row and
          open every shop as you pass. Twenty clicks is twenty complete carts -
          and walking somewhere nobody else walks is worth far more than being
          the second person in a busy market.
        </p>
      </Card>

      {/*
        Said plainly and early rather than buried, because it is the question
        that actually stops someone installing: an unsigned executable that
        reads network traffic is a reasonable thing to be suspicious of.
      */}
      <Card>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
            Windows will warn you
          </h2>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
          The overlay is signed, but with a self-signed certificate - it proves
          the file has not been altered since it was built, and nothing more, so
          Windows shows an unknown-publisher warning. A commercial certificate
          costs a few hundred dollars a year and still has to earn its
          reputation before that warning goes away.
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
          What actually verifies your download is the SHA-256 checksum, which is
          published for every release; the zip includes a script that checks it
          for you. The overlay reads network traffic and nothing else - no code
          is injected into the game, no memory is read or written, and the
          capture socket is receive-only, so nothing is ever transmitted to the
          game server.
        </p>
        {/*
          The part of that paragraph a player can check for themselves, which
          is worth more than the rest of it put together.
        */}
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
          You do not have to take any of that on trust. The Setup tab shows a{" "}
          <span className="text-slate-100">live list of what it is reading</span>
          , by packet name, updating as you play - walk into a shop and
          ZC_STORE_ENTRY appears. Names only: what the game sent, never what it
          said.
        </p>
        <a
          href={SAFETY}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-sky-300 transition hover:text-sky-200"
        >
          Checksums and the full security notes{" "}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </Card>
    </div>
  );
}
