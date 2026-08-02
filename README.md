# 👶 Baby Care: Dad's on Duty

A small isometric 3D browser game. **Mom's gone shopping** and left you (Dad) in charge of the
baby across a **6-room home** (Living Room, Kitchen, Bedroom, Office, Nursery, Bathroom) built
around a **central hallway**. Every room opens onto the hallway through exactly one door — private
rooms like the bedroom and bathroom are single-door rooms, not a maze connecting straight into
each other — and the hallway ends at the house's 🚪 **front door**, where you start out. The floor
plan is **randomly generated each run** — room sizes, furniture placement, and wall paintings
differ every time, but always "make sense": the Living Room is always bigger than the Bathroom,
and each room type gets furniture appropriate to it (the Bathroom gets a toilet/sink/shower-or-tub/mirror,
the Bedroom gets a bed/wardrobe/dresser, etc.). The hallway itself takes a different shape each run
too — usually a straight spine (a plain rectangular house), but sometimes it bends 90° partway along
(an **L**-shaped house) or branches into a wide crossbar with a stem hanging off the middle (a
**T**-shaped house) — a real corner or junction in the corridor, not just a resized room. Keep four
needs topped up until Mom gets home — or the baby cries, the **cry-o-meter** fills, and you
panic-call Mommy. Game over.

The baby **crawls around on its own**, wandering between rooms and playing with toys (blocks,
ball, rattle) — playing keeps it happy, helps calm the crying, and nudges the toy around the
floor as it fidgets with it. You can **scoop the baby up** and carry it anywhere to soothe it,
though your hands are then too full to fetch supplies.

Every baby also rolls 1–2 **personality traits** for the run (shown as small icons on its HUD
cluster and on the end card) — 🥺 **Clingy** frets if you wander too far away, 🧗 **Climber** is
riskier around the oven and trips more, 🥣 **Picky Eater** refuses food in stretches (milk still
works), 🧸 **Favorite Toy** means one specific toy soothes it twice as well, 🧷 **Diaper Machine**
dirties diapers faster but pays out more 💩 per change, and 🥰 **Cuddle Bug** builds happiness just
from being held. Same seed, same traits — so a daily challenge run stays fair between players.

The baby can also **randomly throw up** (going visibly queasy 🤢 first) — a mess appears on the
floor that only a 🧹 **mop** (grab one from the bathroom) can clean up, and leaving it too long
adds to the cry-o-meter. It can also toddle into the 🔥 **oven** in the kitchen if left
unsupervised (a burn — instant crying until you comfort it; a persistent banner warns you the
moment it starts heading that way), or choke on something small (a cough warns you shortly
before), or trip and fall while walking upright. Every hazard telegraphs itself first — nothing
fires with zero warning. Need your hands free for a bit? Scoop the baby into the 🔒 **playpen**
(living room) — it's safe there, but only for a short while before it climbs back out on its own.

You're not just reacting, either. **Tidy toys** near the baby to push back the choking risk,
**baby-proof the oven** (at the oven, costs 💩) to remove that hazard for the rest of the run,
**stretch** at the bed to reset your own back-pain clock before it strikes, and use the toilet
preemptively even without an urgent need.

Babies also get messy over time — a 🧼 **dirty meter** on their HUD cluster climbs from throwing
up, an overdue diaper, or just ordinary crawling around, and eventually starts adding to the
cry-o-meter. Pick the baby up and carry them to the 🛁 **bath** (whichever the bathroom generated)
and press `E` to wash them off — you're braced in place for a few seconds, safe but immobile —
then bring them straight to the 🧺 **towel rack** to dry off. Skip the towel and they stay wet,
which nudges the cry-o-meter a little faster until you finish the job.

Dad's also supposed to be working from home. The 💻 **computer** in the office pings with a
message now and then — get there and reply within the shown time window, or missing it costs
you a chunk of the cry-o-meter. Miss too many across a run and you're **fired** — instant game
over.

Every run moves through four **day phases**, shown next to the timer with a banner on each
transition: 🌅 **Morning** (needs drain fast, but work stays quiet), 🍽️ **Lunch** (food drains
double and the oven hazard gets real), 🕑 **Afternoon** (a bit of a breather, but every work ping
you dodged earlier shows up now), and 🌆 **Evening** — always the run's last 60 seconds — when
everything ramps up at once as Mom gets close. Endless Mode just cycles the four phases
indefinitely instead of ending on Evening.

Press `Esc` any time during play to pause: switch the background music track, re-read the how-to-play
help, or check a live 2D map of the house showing exactly where Dad and the baby are.

Prefer no fixed end time? Turn on **Endless Mode** on the difficulty screen — the "Mom's back in…"
timer is replaced by a survival clock and a score (seconds survived + a bonus per 💩 poo banked),
multiplied by up to +200% the longer you keep every need on every baby above a healthy floor
without a single one running empty — your current streak shows right next to the score, and
pushing a diaper to 0% for the 4× poo bonus is a real, deliberate trade-off against it. A
per-difficulty high score is saved locally in the browser.

Whether you win or lose, the end screen breaks down the run: a sparkline of the cry-o-meter over
time, a tally of every hazard you faced, your longest calm streak, and a **Copy Result** button
that puts a shareable text summary (plus the game's URL) on your clipboard.

Want to compare a run against everyone else, not just yourself? **📅 Daily Challenge** (main menu)
gives every player the same house, the same hazard timing, and the same difficulty for the whole
UTC day — the difficulty rotates day to day, so today might be King while tomorrow's First Born.
One attempt per day (tracked in this browser), with its own leaderboard scored the same way as
Endless Mode's.

Built around a single `index.html` — [Three.js](https://threejs.org) for the 3D (vendored locally
in `vendor/`, no CDN dependency), the Web Audio API for sound effects, and two selectable
background tracks (pick one on the difficulty screen) mixed in quietly under the gameplay.
Multiplayer and both leaderboards (endless mode and the daily challenge) use Firebase, loaded from
Google's CDN since they need a live backend regardless. No build step, no bundler.

The game is also an installable, offline-capable PWA (`manifest.json` + `sw.js`) — once you've
loaded it once over `http(s)`, it keeps working with no network at all (solo/local play; anything
Firebase-backed obviously still needs a connection).

## Run it

Service workers (and thus offline play) require `http(s)`, not `file://`, so serve it locally:

```bash
npx serve .
```

…then open the printed `http://localhost:…` URL. (Any static server works, e.g.
`python3 -m http.server`.) Opening `index.html` directly via `file://` still runs the game, just
without offline caching.

## How to play

| Control | Action |
| --- | --- |
| `W` `A` `S` `D` / arrows | Move Dad around the rooms (walk through doorways) |
| `E` | Interact with the nearest station or the baby |
| `Q` | Drop / throw away whatever you're carrying |
| `Space` | Pick up / put down the baby |
| `U` | Open/close the upgrade workbench |
| `M` | Mute / unmute |
| `Esc` | Pause — music picker, help, and the house map |
| Mouse wheel / scroll | Zoom in and out — walls between the camera and Dad/baby fade semi-transparent so the zoomed-in view never hides the action |

The game starts already zoomed in on Dad rather than a full-house overview — scroll out any time
for the bird's-eye view.

**The loop:** each need drains over time.

- 🍎 **Food** — grab a meal at the **kitchen**, carry it to the baby, press `E` to feed.
- 🍼 **Milk** — grab a bottle from the **fridge**, bring it over, press `E`.
- 👶 **Diaper** — grab a clean diaper at the **changing table**. You can only actually change it
  once the diaper need has decayed to **40% or below** (no changing a clean diaper) — and the
  dirtier it is when you change it, the more 💩 **poo** you collect (up to 4× the base amount,
  further boosted by the diaper upgrade).
- 📺 **Cartoons** — switch on the **TV** with `E`; the baby stays entertained for a while.

Let any need hit zero and the baby cries — the **cry-o-meter** climbs (faster the more needs are
empty) and drains when the baby's content. Fill it and you lose.

There are also two deliberate ways to bail out, each ending the game immediately with its own
flavor screen rather than being a real strategy: the 🚪 **closet** in the bedroom ("you hid — 
coward"), and the 🚪 **front door** at the end of the hallway ("you just walked out on the baby").

## Upgrades (spend 💩 at the 🛠️ workbench)

- 🍲 **Tasty Food** — baby stays full longer
- 🍼 **Bigger Bottle** — less thirsty
- 🧷 **Premium Diapers** — collect more poo per change
- 📺 **Fun Cartoons** — holds attention longer
- 👟 **Quick Steps** — Dad moves faster around the house
- 💪 **Strong Arms** — carry the baby longer before your arms give out
- 💊 **Pain Medication** — shortens back-pain episodes, and makes stretching at the bed cheaper

Each upgrade has a level cap, so no single lucky run can trivialize the house.

## 👤 Dad Level

Every run — win *or* lose — banks ⭐ XP toward a persistent Dad Level: diaper changes, cuddles,
baths given, and hazards handled all count, plus a little just for how long you survived. It's
saved on this device and never resets, so even a rough run leaves you with something to show for
it. Check **👤 Profile** on the main menu for your level, lifetime stats, and unlock progress.
Leveling up raises solo runs' upgrade cap and starting 💩, and unlocks more 🎨 outfit colors to
pick from there — multiplayer rounds always use the base cap and no starting bonus, so nobody's
Dad Level gives them an edge in a shared room.

## Tuning

All the knobs live near the top of the `<script>` in `index.html`:
`BASE_DECAY` (need drain rates), the cry-o-meter fill/drain rates in the main loop,
`UPGRADES` (costs & effects), and `DIFFICULTIES` (per-difficulty survival time, decay/cry
multipliers, hazard chances, and notification timing).

The house layout is generated by `buildHouse()`, which picks one of three shapes each run
(`layoutRect`/`layoutL`/`layoutT`) and hands back a uniform `{cells, halls, ...}` structure: `cells`
are plain rectangular rooms (each with a `doorSide` into the hallway), `halls` are one or more
hallway floor rects (more than one once the corridor bends or branches). Every room then builds its
own four walls generically (`buildRoomWalls` — door / windowed exterior / plain divider, whichever
applies to each side), which is what lets the hallway itself bend or branch without any shape-specific
wall-collection code. The smallest room always gets the smallest-ranked room type (`ROOM_RANK`,
bathroom → living room), so sizing always makes sense regardless of the shape or which slot it lands
in. Each room type's furniture is placed by `buildBathroom`/`buildBedroom`/etc. using `wallPos()`
(wall-relative placement, corner-biased via `edgeT()` so nothing ever blocks the doorway).
