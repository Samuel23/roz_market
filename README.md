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

## Contributing prices

Nothing here is scraped or entered by hand. The index is only as good as the
number of people walking markets with the overlay running, and contributing
takes one checkbox.

1. Run **`roz_overlay.exe`**.
2. Open **Setup** and tick *Contribute anonymous market prices to community
   index*. It is off until you turn it on, and the line under it says what
   leaves your machine.
3. Play.

That is the whole procedure. There is nothing to install, no account, no key
and nothing to press afterwards - what you see while shopping is uploaded in
the background and the Setup tab keeps a running count of it.

Three ordinary things you already do each contribute something different, and
the index needs all three:

| What you do | What it adds |
| :--- | :--- |
| Walk through a market | Puts shops on the map - name, owner and position, no prices |
| Open a shop | The only thing that yields a **full** stock list, and the only thing allowed to remove items that have sold |
| Use the vending search | Prices for shops you never opened, including ones on maps you are not standing in |

So a lap of the market maps everything, and opening the shops you were going
to open anyway is what actually prices it. If you are only going to do one
thing, walk somewhere nobody else is walking - a second person in the same
market at the same time adds far less than a first person in an empty one.

### What is sent, and what is not

What shops broadcast to **everyone standing on the map already**: shop title,
owner name, position, items, prices, quantities, refine, cards and options.

Never your character, your account, your position, your inventory, your
zeny, your chat, or anything about what you buy. There is no login: an
install identifies itself with a random string it generated locally, which
you can clear at any time by turning the toggle off.
