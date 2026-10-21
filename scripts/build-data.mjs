// Builds data/schedule.json from ESPN's public NBA scoreboard feed.
// Run by the GitHub Action in .github/workflows/refresh.yml (Node 18+, no dependencies).
//
// Output: { generated, partial: {YYYY-MM-DD: "note"}, games: [{ id, s, a, h, t, state, as?, hs?, n? }] }
//   s     start time, UTC ISO
//   t     what to open: nbc | nbcsn | espn | abc | prime | nbatv | peacock | lp
//   state pre | in | post (ESPN's own words)
//   as/hs final away/home points, only when state is post
//
// Hand edits go in data/overrides.json, never in schedule.json (the next run would overwrite them).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

const OUT = "data/schedule.json";
const OVERRIDES = "data/overrides.json";
const BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=";
const DAYS_BACK = 1;
const DAYS_AHEAD = 8;
const NATIONAL_TYPES = new Set(["nbc", "nbcsn", "espn", "abc", "prime", "nbatv", "peacock"]);

const fmtDay = (tz) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
const etDay = fmtDay("America/New_York");
const ptDay = fmtDay("America/Los_Angeles");

export function normTeam(name) {
  return name === "Los Angeles Clippers" ? "LA Clippers" : name;
}

// Which service to open, from the national broadcast names ESPN lists for a game.
export function typeFor(names) {
  const n = new Set(names.map((x) => String(x).trim().toUpperCase()));
  if (n.has("NBC")) return "nbc";
  if (n.has("NBCSN")) return "nbcsn";
  if (n.has("ESPN") || n.has("ESPN2")) return "espn";
  if (n.has("ABC")) return "abc";
  if ([...n].some((x) => x.includes("PRIME"))) return "prime";
  if (n.has("NBA TV") || n.has("NBATV")) return "nbatv";
  if (n.has("PEACOCK")) return "peacock";
  return "lp"; // regional TV or League Pass only
}

export function parseEvents(data) {
  const games = [];
  for (const ev of data.events || []) {
    const c = ev.competitions && ev.competitions[0];
    if (!c || !c.competitors) continue;
    const home = c.competitors.find((x) => x.homeAway === "home");
    const away = c.competitors.find((x) => x.homeAway === "away");
    if (!home || !away) continue;
    const names = [
      ...(c.broadcasts || []).filter((b) => b.market === "national").flatMap((b) => b.names || []),
      ...(c.geoBroadcasts || [])
        .filter((g) => g.market && g.market.type === "National")
        .map((g) => g.media && g.media.shortName)
        .filter(Boolean),
    ];
    const state = ev.status && ev.status.type && ev.status.type.state;
    const g = {
      id: String(ev.id),
      s: new Date(ev.date).toISOString().replace(".000Z", "Z"),
      a: normTeam(away.team.displayName),
      h: normTeam(home.team.displayName),
      t: typeFor(names),
      state: state === "in" || state === "post" ? state : "pre",
    };
    if (g.state === "post") {
      const as = Number(away.score), hs = Number(home.score);
      if (Number.isFinite(as) && Number.isFinite(hs)) { g.as = as; g.hs = hs; }
    }
    games.push(g);
  }
  return games;
}

// Days that only have national-TV games this far ahead are probably incomplete.
export function partialDays(games, now = Date.now()) {
  const byDay = {};
  for (const g of games) (byDay[ptDay.format(Date.parse(g.s))] ||= []).push(g);
  const today = ptDay.format(now);
  const partial = {};
  for (const [day, list] of Object.entries(byDay)) {
    const ahead = (Date.parse(day) - Date.parse(today)) / 86400000;
    if (ahead >= 4 && list.every((g) => NATIONAL_TYPES.has(g.t))) {
      partial[day] = "Only the games on national TV are listed for this day so far.";
    }
  }
  return partial;
}

async function getJson(url) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": "nba-tv-schedule (github.com/Itiseddie/nba-tv-schedule)" } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } catch (e) {
      lastErr = e;
      await new Promise((res) => setTimeout(res, 1000 * attempt));
    }
  }
  throw new Error(url + " failed: " + lastErr);
}

async function main() {
  const now = Date.now();
  const days = [];
  for (let i = -DAYS_BACK; i <= DAYS_AHEAD; i++) days.push(etDay.format(now + i * 86400000).replaceAll("-", ""));

  // If any day fails, stop without writing, so the site keeps its last good data.
  const results = await Promise.all(days.map((d) => getJson(BASE + d)));
  const byId = new Map();
  for (const data of results) for (const g of parseEvents(data)) byId.set(g.id, g);

  const ov = existsSync(OVERRIDES) ? JSON.parse(readFileSync(OVERRIDES, "utf8")) : {};
  for (const [id, patch] of Object.entries(ov.games || {})) {
    if (byId.has(id)) Object.assign(byId.get(id), patch);
  }
  // Keep today and the next 7 days (Pacific), plus yesterday so finished games still show a score.
  const lastDay = ptDay.format(now + 7 * 86400000);
  const games = [...byId.values()]
    .filter((g) => ptDay.format(Date.parse(g.s)) <= lastDay)
    .sort((x, y) => x.s.localeCompare(y.s) || x.id.localeCompare(y.id));
  if (!games.length) throw new Error("No games came back; keeping the existing file.");

  const partial = { ...partialDays(games, now), ...(ov.partial || {}) };
  const next = { partial, games };

  let prev = null;
  if (existsSync(OUT)) {
    try { const p = JSON.parse(readFileSync(OUT, "utf8")); prev = { partial: p.partial, games: p.games }; } catch {}
  }
  if (prev && JSON.stringify(prev) === JSON.stringify(next)) {
    console.log("No changes (" + games.length + " games).");
    return;
  }
  mkdirSync("data", { recursive: true });
  writeFileSync(OUT, JSON.stringify({ generated: new Date(now).toISOString(), ...next }, null, 1) + "\n");
  console.log("Wrote " + games.length + " games.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
