// Replace the real players in tools/fixture.json with stand-ins.
//
// The fixture is a real market recording, which is what makes it worth
// having: hand-written mock data is written by someone who already knows what
// the UI expects, so it agrees with the UI by construction and proves
// nothing. But a real recording carries real people - character names,
// account ids, and the shop titles they typed - into a public repository,
// where git history keeps them long after the live index has pruned them.
//
// So the shape is kept and the identities are not. Every replacement is the
// same length as the original and preserves each character's class: a capital
// stays a capital, a digit stays a digit, an accented letter stays accented,
// and punctuation, spaces, stars and box-drawing characters pass through
// untouched. That is the half the layout cares about - a 36-character title
// still overflows exactly where the real one did.
//
// Deterministic, so re-running produces an identical file and a clean diff,
// and so one player maps to one stand-in everywhere they appear.
//
//   node tools/scrub-fixture.mjs [path]        # rewrites in place
//   node tools/scrub-fixture.mjs --check       # non-zero if it needs a run
//
// Both become no-ops once the file carries "scrubbed": true, so this is safe
// to run twice and safe to wire into a hook.
//
// Run this after regenerating the fixture:
//
//   python ro_market.py captures/<prefix> --json C:/roz_market/tools/fixture.json
//   node tools/scrub-fixture.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const check = args.includes("--check");
const path = args.find((a) => !a.startsWith("--")) ?? join(HERE, "fixture.json");

// A fixed seed, because a random one would rewrite every name on every run
// and make the diff useless.
const SEED = 0x9e3779b9;

function hash(str) {
  let h = SEED;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// A tiny deterministic generator, so every character of one name is drawn
// from the same stream and the whole name is a pure function of the original.
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;  s >>>= 0;
    return s;
  };
}

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";     // no I/O, they read as 1/0
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGIT = "0123456789";
// Kept in the same visual weight class as what they replace, so a title that
// was wide because of an umlaut stays wide.
const ACCENT_UPPER = "ÄÖÜÀÉÈÊÇÑ";
const ACCENT_LOWER = "äöüàéèêçñß";

function classOf(ch) {
  const code = ch.codePointAt(0);
  if (ch >= "A" && ch <= "Z") return UPPER;
  if (ch >= "a" && ch <= "z") return LOWER;
  if (ch >= "0" && ch <= "9") return DIGIT;
  if (code > 127) {
    // Only letters are identifying. Stars, arrows, box-drawing and
    // non-breaking spaces are decoration a player chose, and they are what
    // makes a title hard to lay out - keep them exactly.
    const upper = ch.toUpperCase() !== ch.toLowerCase() && ch === ch.toUpperCase();
    const lower = ch.toUpperCase() !== ch.toLowerCase() && ch === ch.toLowerCase();
    if (upper) return ACCENT_UPPER;
    if (lower) return ACCENT_LOWER;
    return null;                 // symbol: pass through
  }
  return null;                   // space, punctuation: pass through
}

const memo = new Map();

function pseudonym(s) {
  if (s === null || s === undefined || s === "") return s;
  const seen = memo.get(s);
  if (seen !== undefined) return seen;
  const next = rng(hash(s));
  let out = "";
  for (const ch of s) {
    const pool = classOf(ch);
    out += pool === null ? ch : pool[next() % pool.length];
  }
  memo.set(s, out);
  return out;
}

// Account ids are the join key between vendors and observations, so the map
// has to be injective or two shops would merge into one. Collisions are
// resolved by walking, which stays deterministic.
const idMap = new Map();
const idTaken = new Set();

function pseudoId(id) {
  if (id === null || id === undefined) return id;
  const got = idMap.get(id);
  if (got !== undefined) return got;
  const next = rng(hash("aid:" + id));
  let candidate = 100000 + (next() % 8900000);
  while (idTaken.has(candidate)) candidate = 100000 + (next() % 8900000);
  idTaken.add(candidate);
  idMap.set(id, candidate);
  return candidate;
}

function scrubVendor(v) {
  if (!v) return v;
  v.account_id = pseudoId(v.account_id);
  v.owner_name = pseudonym(v.owner_name);
  v.shop_title = pseudonym(v.shop_title);
  return v;
}

const before = readFileSync(path, "utf-8");
const data = JSON.parse(before);

// A marker in the file, rather than comparing it against a re-scrub of
// itself. Scrubbing maps names to names, so it is not idempotent - a second
// pass would pseudonymise the pseudonyms - which makes "would re-running
// change this?" always true, and it answers the wrong question anyway. What
// is being asked is whether real players are still in here, and only the file
// can say.
if (data.scrubbed) {
  console.log(`${path} is already scrubbed`);
  process.exit(0);
}
if (check) {
  console.error(
    `${path} still holds real names - run: node tools/scrub-fixture.mjs`,
  );
  process.exit(1);
}

for (const v of data.vendors ?? []) scrubVendor(v);
for (const o of data.observations ?? []) {
  scrubVendor(o.vendor);
  // The collector id would identify the machine that recorded this. It is
  // null in a replay, but never let one through if that changes.
  if (o.collector) o.collector = "fixture";
}
data.scrubbed = true;

const after = JSON.stringify(data, null, 1) + "\n";

writeFileSync(path, after, "utf-8");
console.log(
  `scrubbed ${data.vendors?.length ?? 0} vendors and ` +
  `${data.observations?.length ?? 0} observations ` +
  `(${memo.size} distinct names, ${idMap.size} account ids)`,
);
