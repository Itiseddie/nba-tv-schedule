# NBA Game Finder

A large-text page that answers one question: **where do I turn on tonight's NBA game?**

Built for an elderly family member who loves the NBA, has trouble reading small text, and is not comfortable with technology. Each game gets one big card with the teams, the tip-off time (Pacific), and the service to open (YouTube TV, or Prime Video / NBA League Pass), with the channel name in a large tile.

## What it does

- Day picker for today through the next 7 days
- Live games float to the top under "On right now"
- Final scores on finished games
- Two or three columns depending on screen width, one column at the largest text sizes
- A− / A+ buttons for text size, remembered between visits
- Light and dark mode follow the device

## How the data gets onto the page

1. **GitHub Action** (`.github/workflows/refresh.yml`) runs `scripts/build-data.mjs` every morning (about 7am Pacific) and every 20 minutes through game hours. It reads ESPN's public scoreboard feed for the next 8 days and writes `data/schedule.json`. It commits only when something changed (a new game, a broadcast change, a game going final).
2. **The page** (`index.html`) loads `data/schedule.json` when it opens, then asks ESPN directly for game status and final scores every 2 minutes while the page is open.
3. **Fallback:** `index.html` also contains a built-in schedule for Oct 20&ndash;27, 2026. If the data file or ESPN can't be reached, the page still works with that.

To refresh right now: **Actions → Refresh NBA data → Run workflow**.

## Which service the page tells her to open

`scripts/build-data.mjs` turns ESPN's national broadcast list into a type, and `SERVICE` in `index.html` says what to show for each type:

| Type | Shown as |
|---|---|
| `nbc`, `nbcsn`, `espn`, `abc` | YouTube TV, with the channel name in a big tile |
| `prime` | Prime Video (a national game, League Pass not needed) |
| `nbatv`, `lp` | Prime Video, then NBA League Pass |
| `local` | YouTube TV, Warriors channel (Warriors games that are not on national TV are blacked out on League Pass in San Francisco; set in `prep()` in `index.html`) |
| `peacock` | Peacock only (YouTube TV does not have it) |

## Fixing a wrong or missing broadcast

ESPN's feed can be incomplete or wrong. Edit `data/overrides.json` (never `data/schedule.json`, which the Action overwrites):

```json
{
  "games": {
    "401909876": { "t": "nbcsn", "n": "Optional note shown on the card" }
  },
  "partial": {
    "2026-10-27": "Only the games on NBC are listed for this day so far."
  }
}
```

The game id is in ESPN's feed (and in `data/schedule.json`). `t` is one of the types above.

## Known limits

- The ESPN feed is public but unofficial and undocumented. It could change or stop working.
- Whether a browser may read ESPN's feed directly was not verified when this was built. If it is blocked, scores still arrive through the data file, just a few minutes later.
- ESPN lists only national broadcasts. Every other game is shown as League Pass.
- GitHub pauses scheduled workflows in public repos after about 60 days without repository activity. If the refresh stops, re-enable it from the Actions tab.

## Credits and notes

- Team logos come from [ChrisKatsaras/react-nba-logos](https://github.com/ChrisKatsaras/react-nba-logos), converted to standalone SVG images. That repository has no license for the logos.
- NBA and team names and logos are trademarks of their respective owners. This is an unofficial personal project and is not affiliated with the NBA or any team.
