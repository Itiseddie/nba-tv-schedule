# NBA Game Finder

A large-text page that answers one question: **where do I turn on tonight's NBA game?**

Built for an elderly family member who loves the NBA, has trouble reading small text, and is not comfortable with technology. Each game gets one big card with the teams, the tip-off time (Pacific), and the service to open (YouTube TV, Prime Video / NBA League Pass), with the channel name in a large tile.

## What it does

- Day picker for today through the next 7 days
- Live games float to the top under "On right now"
- Two or three columns depending on screen width, one column at the largest text sizes
- A− / A+ buttons for text size, remembered between visits
- Light and dark mode follow the device
- Final scores on finished games

## Files

- `index.html` is the whole site: page, styles, schedule data and team logos in one file.

## Updating the data

Schedule, broadcasters and final scores are currently typed into `index.html`:

- `GAMES` lists every game (UTC start time, teams, and a broadcast type)
- `SERVICE` says what to open for each broadcast type
- `SCORES` holds final scores, keyed by start time and away team
- `PARTIAL` flags a day whose schedule is not complete yet

Broadcast types: `nbc`, `nbcsn`, `espn` (YouTube TV), `prime` (Prime Video national game), `nbatv` and `lp` (NBA League Pass through Prime Video), `local` (Warriors games not on national TV, via YouTube TV in San Francisco).

## Planned

- Daily refresh of the schedule and broadcasters
- Final scores fetched each time the page loads
- A manual override file for broadcast changes

## Credits and notes

- Team logos come from [ChrisKatsaras/react-nba-logos](https://github.com/ChrisKatsaras/react-nba-logos), converted to standalone SVG images. That repository has no license for the logos.
- NBA and team names and logos are trademarks of their respective owners. This is an unofficial personal project and is not affiliated with the NBA or any team.
- Schedule and broadcast data were checked on Oct 20, 2026 against NBA, NBC, ESPN and Amazon announcements. Broadcasts can change.
