# ROZ Market

A community price index for Ragnarok Online Zero vending. Search what players
are selling, see what a shop had when someone last looked at it, and find the
shop on the map before walking to it.

Live at **https://Samuel23.github.io/roz_market/**

## What this is, and what it is not

Every listing here is what a player walking the market last saw. It is not a
live feed and it is never complete: a shop nobody has opened has a position
and a name but no prices, and a price is only as current as its timestamp,
which is shown on every row.

The data comes from the ROZ Overlay, a passive companion app that reads the
game's own network traffic. Contribution is opt-in and anonymous. What is
published is what shops broadcast to everyone standing on the map already -
shop title, owner name, position, items and prices. Nothing about the player
who saw them.

## Running it locally

```bash
npm install
npm run dev
```

Point it at a backend with `.env.local` (copy `.env.example`). Both values are
public by design: the anon key can read the four market tables and write
nothing.

There is no backend requirement for UI work. `tools/mock-api.mjs` answers the
same routes from `tools/fixture.json`, which is a real 240-second market
recording put through the real collector - 191 vendors, 206 listing rows.
The names are stand-ins (`tools/scrub-fixture.mjs`), but every one is the same
length as the player's original and keeps each character's class, so the
shapes a layout has to survive are the real ones:

```bash
node tools/mock-api.mjs
```

Then set `VITE_SUPABASE_URL=http://localhost:54321` and any non-empty key.

## Layout

| Path | What lives there |
| :--- | :--- |
| `src/pages/Home.tsx` | search, filters, pagination |
| `src/pages/MapPage.tsx` | every vendor on one map, priced or not |
| `src/components/MapRadar.tsx` | the minimap and its pins |
| `src/lib/minimap.ts` | cell -> pixel projection (bounding square, not a plain scale) |
| `src/lib/api.ts` | the two read APIs and the shapes they answer with |
| `src/data/` | item, card, option and map tables generated from the client |
| `public/minimaps/` | minimap images extracted from the client |

`src/data/` and `public/minimaps/` are generated, not hand-edited - see
`build_market_seed.py` and `build_market_maps.py` in the overlay repo.

## Deploying

Push to `main`. `.github/workflows/deploy.yml` builds and publishes to GitHub
Pages, taking `VITE_BASE` from the repository name, so renaming the repo moves
the site without an edit. It needs two repository secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

and **Settings -> Pages -> Source: GitHub Actions**.
