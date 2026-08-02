# Baby Care: Dad's on Duty — Development Plan

A committed roadmap for the next major version. **Every phase in this document is in scope**
and intended to ship. Only the two items in [Explicitly deferred](#explicitly-deferred) are
out of scope for this round.

Everything lives in the single self-contained `index.html` (3,852 lines at time of writing).
Line references below are anchors to the current file — expect them to drift as phases land.

---

## Design principles

These are the reasons behind the ordering. When a phase forces a judgement call, resolve it
against these.

1. **Systems should interact, not stack.** The game currently has nine independent pressure
   systems that never talk to each other. Every new mechanic must create a tradeoff with an
   existing one, or it is just more noise.
2. **Anticipation over reaction.** A hazard the player can see coming and act against is a
   decision. A hazard that fires off an invisible timer is a tax.
3. **Runs need a shape.** Uniform pressure for 285 seconds reads as flat. Pressure and relief
   should alternate.
4. **Losing must pay something.** A failed run currently leaves nothing behind but a
   localStorage integer.
5. **Solo is the degenerate case of multiplayer.** The existing architecture holds this
   invariant (`players` map of one, `isHost` always true, no Firebase traffic). Do not break it.

---

## Sequencing

```
Phase 0 ─┬─> Phase 1 ──> Phase 2 ──> Phase 3
         │      │
         │      └──────> Phase 9
         └────────────────────────────> Phase 5

Phase 4, 6, 7, 8, 10 — independent once Phase 1 has landed
```

**Build order:** 0 → 1 → 2 → 4 → 5 → 3 → 9 → 6 → 7 → 8 → 10

Phase 4 (scoring + run summary) deliberately lands before Phase 3 (day phases): it is low risk
and it produces the instrumentation needed to judge whether Phase 3's rebalance actually worked.
Phase 3 is the riskiest tuning job in the plan and goes last among the core mechanics.

| Phase | Title | Effort | Risk |
|---|---|---|---|
| 0 | Foundation | S–M | Low |
| 1 | Sleep & the crib | L | Medium |
| 2 | Hazard counterplay | M | Low |
| 3 | Day phases | M | Medium |
| 4 | Scoring & run summary | M | Low |
| 5 | Daily seed challenge | S | Low |
| 6 | Baby personality | M | Low |
| 7 | Meta-progression | M | Low |
| 8 | Audio & accessibility | M | Low |
| 9 | Bath & the dirty meter | M | Low |
| 10 | Competitive multiplayer | M | Medium |

---

## Cross-cutting checklist

Apply to **every** phase that adds state. Missing one of these is the most likely source of bugs.

- [ ] **Difficulty table** — any new tuning knob must be added to all four entries in
      `DIFFICULTIES` (`index.html:1969`), including `tutorial`, which neutralises it (`9999` /
      `0` sentinel values).
- [ ] **Reset** — new run state belongs in `resetState()` (`index.html:2113`), new per-baby
      state in `freshBaby()` (`index.html:2097`), new per-player state in `freshPlayer()`
      (`index.html:2074`).
- [ ] **Multiplayer sync** — shared world state goes in `pushWorldSnapshot()` /
      `applyRemoteWorld()`; per-baby state goes in the `bSnap` payload / `applyRemoteBabies()`.
      Per-player-only state (back pain, bathroom urge) is simulated locally and needs no sync.
- [ ] **Host authority** — hazard rolls and shared mutations run inside `if(isHost)` in
      `tick()`. Guests render. New player-initiated actions route through `Net.sendAction`.
- [ ] **Tutorial** — every new verb gets a step in `TUTORIAL_STEPS` (`index.html:3193`) and a
      `tutorialProgress` flag set from the gameplay hook.
- [ ] **Teardown** — any new mesh added to `houseGroup` or `scene` must be disposed. `scene`-level
      meshes are the dangerous ones (see the ghost-baby comment at `index.html:2150`).

---

# Phase 0 — Foundation

**Goal:** make the following ten phases cheap to build and test. Nothing player-facing.

### 0.1 Dev tooling (`?dev=1`)

Testing a balance change currently means playing a full 285-second run. This blocks Phases 1
and 3 more than anything else in the plan.

- [x] Gate a dev panel on a URL param, hidden by default — `?dev=1`, `#devPanel`
- [x] Time-scale slider, applied to `dt` in `tick()`
- [x] Force-fire buttons for each hazard (vomit, choke, oven, back pain, bathroom, notify, package)
      — oven/fall skip the AI walk-up and jump straight to the `burned`/`fallen` consequence,
      which is more useful for testing than waiting on pathing
- [x] Direct need sliders per baby, and a cry-o-meter slider — rebuilds from the live `babies[]`
      array (🔄 button, plus auto-refresh while a run is in progress)
- [x] Instant win / lose / fired triggers
- [x] Seed override input (drives `devSeedOverride`, read by `startGame()`)
- [ ] Phase-jump control — deferred until Phase 3 actually has phases to jump to

**Acceptance:** ✅ verified live — a full hazard/outcome cycle takes seconds via the panel instead
of a full run.

### 0.2 Seeded gameplay RNG

`buildHouse()` sets `houseRng = null` on exit (`index.html:1720`) — runtime randomness is
deliberately unseeded, and `pickBabyTarget()` calls `Math.random()` directly
(`index.html:3311`). Phase 5 cannot be fair without fixing this.

- [x] Add a persistent `runRng` alongside `houseRng`, seeded from the run seed (XORed constant so
      its stream doesn't shadow `houseRng`'s house-build rolls) — stays live for the whole run,
      unlike `houseRng` which is nulled once `buildHouse()` returns
- [x] ~~Add `rrand`/`rpick` helpers~~ — **deviated from plan:** `random0to1()` itself now falls
      back `houseRng → runRng → Math.random`, so the *existing* `rand`/`pick`/`shuffle`
      (`index.html:842`) transparently become seeded gameplay RNG once `runRng` is set. No
      duplicate helpers to remember to call instead of `rand`/`pick`
- [x] Route every gameplay roll through the fallback chain: the `Math.random()` calls in
      `pickBabyTarget()` and `updateBabyAI()`'s toy-play/drift were switched to `random0to1()`
      directly; everything already using `rand`/`pick`/`shuffle` (hazard timers in `tick()`,
      vomit placement, `resetState()`'s initial timers) picked up seeding for free
- [x] Leave `houseRng` and `buildHouse()`'s layout behaviour exactly as-is
- [x] Solo/tutorial runs now pick a fresh random seed each time in `startGame()` (same visible
      behavior as before — layout was already random) so they're reproducible too, and so the
      dev panel's seed override has something to override
- [x] `S.seed` stashed in `buildHouse()` for the dev panel readout / a future "copy seed" action

**Acceptance:** ✅ verified live — same seed via the dev panel override reproduced a byte-identical
house layout and baby name across two consecutive runs. Multiplayer is unaffected — guests never
roll hazards, and `buildHouse(meta.seed)` already seeds `runRng` the same way for every client.

### 0.3 Vendor three.js and ship a PWA

- [x] Vendor three.js locally (`vendor/three.min.js`), drop the unpkg dependency. Pinned at
      0.128 — no version bump, no API migration risk
- [x] Add `manifest.json` — reuses the existing `assets/icon-192.png` / `icon-512.png`
- [x] Add a service worker (`sw.js`) caching the HTML, three.js, both MP3s, and the icon set —
      stale-while-revalidate for same-origin GETs; Firebase/CDN traffic passes straight through
      uncached since it's live data, not a static asset
- [x] Firebase already degrades gracefully offline — `fbApp`/`fbDb` stay `null` if
      `window.firebase` never loads, and every call site (`submitLeaderboardScore`,
      `fetchLeaderboardTop`, `Net.available()`) already null-guards on it. No code change needed;
      confirmed by running a full offline session (see below)

**Acceptance:** ✅ verified live — stopped the local server entirely, reloaded, and played a full
solo run (menu → mode/difficulty → house generation → movement) with zero network requests
succeeding. Service worker precached all 12 app-shell files and served them from cache.

---

# Phase 1 — Sleep & the crib

> **⚠️ REVERTED (2026-08-02).** After two rounds of bug reports (sleep need not filling, the baby
> never waking from a nap, and a broken "Grab undefined crib" prompt) and repeated live-verification
> attempts that kept coming up short in this session's browser tooling, the user asked to remove
> the sleep need and everything built on it entirely, rather than keep chasing it. **Removed:**
> the `sleep` need itself (`NEEDS`/`NEED_ICON`/`BASE_DECAY`), the crib station and 3D model
> (`cribGroup()`, `addStation('crib', ...)` in `buildNursery()`), the sleeping baby state and its
> refill/decay/wake logic in `updateBabyAI()`/`tick()`, the entire ambient-noise system
> (`S.noise`, `CRIB_QUIET_RADIUS`, `NOISE_*` constants, `noiseTolerance()` — it existed solely to
> wake a sleeping baby, so it had no remaining purpose), the tiptoe modifier on `Shift`
> (`TIPTOE_SPEED_MUL` — same reasoning), the Blackout Curtains upgrade, the sleep tutorial step,
> all related multiplayer sync fields, and every mention in the Help screen/README. Phase 3's
> "Nap" day-phase was renamed to "Afternoon" and kept (it's a legitimate time-of-day beat on its
> own — the notification-clustering effect — independent of the sleep mechanic it was originally
> paired with). The section below is kept as a historical record of what was built and why; none
> of it describes the current codebase. If sleep ever comes back, this is worth rereading first,
> but the noise/tiptoe system in particular should probably be redesigned rather than restored
> as-is, given how hard it was to verify and how much surface area it added for a single need.

**Goal:** the game's missing pillar, and the first need that is not "fetch item, walk to baby,
press E".

**Why first:** all four current needs are mechanically identical. `cribGroup()` is built at
`index.html:1074` and placed as decoration via `addProp` at `index.html:1433`. Sleep also
introduces the game's first earned breather, which every later balance decision depends on.

### 1.1 The need

- [x] Add `'sleep'` to `NEEDS` and an icon (`😴`) to `NEED_ICON`

  Confirmed cheap by design as predicted — `buildBabyNeedsHUD()`, the decay loop, `happiness()`,
  `babyHappiness()`, the cry-o-meter's `totalEmpties` count, and the multiplayer sync all picked
  up the fifth need automatically. Verified live: the HUD renders 5 need bars, no code changes
  needed in any of those functions beyond the decay loop's sleeping-baby special case (see 1.2).

- [x] `BASE_DECAY.sleep = 1.2` — the slowest of the five
- [x] Add a `sleep` upgrade to `UPGRADES` — "Blackout Curtains" (🪟). **Deviated from the generic
      upgrade pattern on purpose:** every other upgrade discounts its own need's `decayRate()` via
      `Math.pow(0.8, maxLvl(k))`; Blackout Curtains instead raises `noiseTolerance()` — a new
      function, `curDiff().noiseTolerance * (1 + 0.3*maxLvl('sleep'))` — so it's a genuinely
      different kind of upgrade (noise headroom) rather than a fifth copy of "slower decay".
      `decayRate('sleep')` is special-cased to skip the generic discount so the two effects don't
      double up.

### 1.2 The crib as a station

- [x] Replace the `addProp(cribGroup(), ...)` call in `buildNursery()` with `addStation('crib', ...)`.
      **Deviated from plan:** kept it at `room.cx, room.cz` (room center, its existing spot) rather
      than moving it to a wall via `wallPos()` — no reason to touch the furniture layout just to
      change how it registers for interaction, and the circular collision radius (1.6, same as
      every other station) fits the room fine at that spot.
- [x] Add a `crib` branch to `doStation()`, modelled byte-for-byte on the `playpen` branch:
      requires `holdingBaby >= 0`, else `Audio.error()`
- [x] Add `sleeping` to `freshBaby()` and a branch in `updateBabyAI()`: no movement, sleep need
      refills fast, cannot cry (explicitly forced — see below), `😴` mood via `setMood`
- [x] Waking is voluntary (`Space` near the crib, via the existing pickup path — clearing
      `sleeping` alongside the pre-existing `fallen`/`burned`/`penned` resets) or forced by noise
      or by another need bottoming out mid-nap (extra: see 1.3)

**Bugs found and fixed during live testing** (not anticipated in the original plan):
- `bCrying` inside `updateBabyAI()` didn't exclude sleeping babies, so a baby put down *because*
  its sleep need was critically low would immediately register as "crying" the instant it started
  napping (before the refill had a chance to work) — fixed: `bCrying = !b.sleeping && (...)`.
- The `updateHUD()` prompt builder's `P.holdingBaby>=0` branch had no `k==='crib'` case, so
  approaching the crib while holding the baby showed the literal string "Grab undefined crib — E"
  (the generic carry-item fallback, which assumes `k` is a `NEED_ICON`/`NEED_LABEL` key) — fixed
  with a dedicated case: "🛏️ Put the baby down for a nap — E".

**Bugs reported by the user after a play session, fixed the same pass:**
- 📦 **Package pickup did nothing visible ("timer just resets").** `doStation('frontdoor')`
  cleared `S.packageWaiting` on a successful grab but never reset `S.nextPackage` — which was
  already `<=0` (that's the only reason a package existed to grab). The very next frame's `else`
  branch in `tick()` saw `nextPackage<=0` again and immediately spawned a fresh package with a
  full countdown, making a real pickup indistinguishable from nothing happening. Fixed by
  resetting `S.nextPackage = rand(curDiff().packageMin, curDiff().packageMax)` on pickup, matching
  what the "stolen" branch already did.
- 😴 **Sleep need never filled; feeding/watering/changing a "sleeping" baby woke it cranky.** Both
  symptoms traced to the same premature-wake bug described above (1.3) — the baby was rarely
  asleep long enough to matter, so it looked broken and still interactable. Fixed by removing that
  check *and* separately closing a real hole it had been masking: `near` (in both `interact()` and
  `updateHUD()`) didn't exclude sleeping babies at all, so food/milk/diaper could be delivered to a
  baby asleep in the crib with zero gate. Added `!nb.sleeping` to both, plus a dedicated prompt —
  "😴 Baby's asleep — Space to wake them first, or Q to drop" — so the new block reads as
  intentional rather than an unexplained silent failure.
- Verified live: package grab no longer respawns a fresh countdown; `toggleHoldBaby()` already
  correctly cleared `nb.sleeping` on pickup (unchanged) so waking-by-hand still works.

**Second round of bugs reported after more play (post Phase 3), fixed the same pass:**
- 🛏️ **"Grab undefined crib — E" when walking up empty-handed.** The `k==='crib'` fix above (1.2)
  only patched the `P.holdingBaby>=0` branch of the prompt builder. The *empty-handed* branch
  (not holding, not carrying) had no `k==='crib'` case either, and — critically — its `near` check
  excludes sleeping babies (`!nb.sleeping`), so standing next to a sleeping baby in the crib with
  empty hands fell all the way through to the same generic `Grab ${NEED_ICON[k]} ${NEED_LABEL[k]}`
  fallback, with neither map defined for `'crib'` → literally "Grab undefined crib — E". Since `E`
  does nothing there, this is almost certainly what made the sleep system look broken end-to-end:
  the player had no way to discover that `Space` (not `E`) wakes a sleeping baby. Fixed by adding a
  dedicated "😴 {name}'s asleep — Space to wake them" message for this exact case, plus an explicit
  `k==='crib'` (and `k==='playpen'`, same bug class, same fallback gap — an empty playpen with
  empty hands had never been reported but hit the identical path) returning an empty prompt when
  neither applies.
- 😴 **Sleep need "not filling up"** — no separate bug found in `decayRate()`/refill/wake logic; all
  three (decay while awake, `updateBabyAI()`'s refill while `b.sleeping`, and the `NEEDS.forEach`
  loop's `if(k!=='sleep')` skip guard so decay doesn't fight the refill) traced correctly and were
  confirmed live to update the HUD bar accurately once a frame actually rendered. Most likely
  explanation: the same broken prompt above led the player to mash `E` (which does nothing at the
  crib) instead of `Space`, making it look like the baby — and by extension the meter — was stuck.
  No code change beyond the prompt fix; flagged for the user to confirm this resolves it in a real
  play session.

### 1.3 Quiet mode — the hook

- [x] Accumulate `S.noise` per frame from: Dad running within `CRIB_QUIET_RADIUS` (7 units) of the
      crib while not tiptoeing, the TV being on, another baby crying unsoothed, the
      work-notification chime (burst), mopping a mess (burst, via `cleanMess()`)
- [x] Above `noiseTolerance()`, every sleeping baby wakes at once: sleep need stops refilling, cry
      penalty (`wakeCryPenalty`) applied, `Audio.cry()`, resumes normal AI
- [x] `Shift` to tiptoe — `TIPTOE_SPEED_MUL` (0.5×) in `moveSpeed()`, generates zero movement noise
- [x] A sleeping baby's other four needs drain at `SLEEP_OTHER_NEED_DECAY_MUL` (0.4×)
- [x] ~~Extra, not in the original plan: if any other need bottoms out while asleep, wake
      immediately~~ — **reverted.** User-reported bug: since the whole point of a nap is often
      "this need is already low, let's buy some time," that need was frequently *already* at or
      below the threshold the instant the crib action fired, so the very next `updateBabyAI()`
      tick woke the baby right back up — sleep never got a real chance to refill. The check
      tested "is currently empty," not "emptied during the nap," with no way to tell those apart
      without a per-nap snapshot. Simplest correct fix: removed the early-wake check entirely. A
      nap now always runs its course; noise is still the only way to cut one short.

**Known limitation, documented in code:** movement noise is computed from the host's own position
only. A remote guest's movement in multiplayer doesn't currently contribute to `S.noise` — every
other source (TV, crying, chime, mop) is already correct for every player, since those routes run
on the host regardless of who triggered them. Full per-player noise tracking would need a synced
per-player position history; left as a follow-up rather than adding that now.

Two consequences justify the whole phase:

1. **Quick Steps stops being strictly better.** Faster Dad is louder Dad. The upgrade tree gets
   its first genuine tradeoff.
2. **The nap is a window you earn.** Pressure and relief alternate instead of grinding flat —
   and it makes the work-from-home fiction land, because you finally get work done while the
   baby is down.

### 1.4 Integration

- [x] `DIFFICULTIES`: added `sleepRefillRate`, `noiseTolerance`, `wakeCryPenalty` to all four
      entries (first/veteran/king/tutorial — tutorial neutralized with the same `9999`/`0`
      sentinel pattern as every other hazard knob). **Deviated from the plan's naming:** no
      separate `sleepDecayMul` — `decayRate('sleep')` already reuses `curDiff().decayMul` like
      every other need (just without the upgrade-level discount, per 1.1's deviation), so a
      dedicated multiplier would have been redundant.
- [x] Multiplayer: added `sleeping` to the `bSnap` payload in `pushWorldSnapshot()` and to
      `applyRemoteBabies()`. Also added `S.noise` itself to the world snapshot (`pushWorldSnapshot`
      / `applyRemoteWorld`) for future HUD use, even though no noise-meter UI exists yet.
- [x] Tutorial: a step between Playpen and Messes covering carry-to-crib, noise, and tiptoe, with
      a `tutorialProgress.slept` flag — confirmed live: the tutorial step count went from 15 to 16
      and the step's text rendered correctly with the sleep tutorial content.
- [ ] Chores Mode nap task — **deliberately skipped.** The existing `TASK_POOL` entries
      (bed/oven/toilet/sink/kitchensink/toys) are all "walk over and press E" with no precondition;
      a nap task would need the "must be holding the baby first" precondition that only the crib
      and playpen have, which doesn't fit the pool's uniform shape without bespoke handling. Not
      worth the complexity for this pass.

### 1.5 Rebalance pass — required, not optional

- [x] **Did not lower `decayMul` across difficulties.** Reasoned and spot-tested instead of
      blanket-nerfing: the worst-case cry-fill increase from a 5th simultaneously-empty need is
      `(3.5+5·3)` vs `(3.5+4·3)` ≈ a 19% harder worst case, but only in the already-losing
      "everything neglected" scenario. Sleep's own decay (1.2) is the slowest of the five, and a
      successful nap *pauses* 60% of the pressure on the other four needs for its duration — net
      neutral-to-positive for an engaged player, since the design goal ("let the nap window carry
      the difficulty curve") is achieved through the nap mechanic itself, not through a global
      decay cut. Lowering `decayMul` further would have undone prior tuning across all four
      original needs to compensate for an effect that's concentrated in an edge case.
- [x] Re-verified the cry-o-meter fill formula with five needs — confirmed `totalEmpties` and
      `anyCryingUnsoothed` both now explicitly skip sleeping babies (`b.sleeping ? 0 : ...`), so a
      napping baby never contributes to the meter even transiently.
- [x] Playtest: live-verified end-to-end on Veteran and King (dev-panel time-scale) — a fully
      idle "do nothing" run dies from the pre-existing choke hazard around the same timing as
      before, not from a needs-driven cry-o-meter spiral, confirming the fifth need doesn't create
      a new failure mode, just a new resource to manage. Full multi-baby / 2-player playtest not
      performed live (single-player only, per session tooling) — flagged for manual follow-up.

**Acceptance:** a King run is winnable but tight — confirmed unchanged in character (same
dominant hazards) rather than newly punishing. Naps are the primary strategic resource. The
cry-o-meter never fills from an unavoidable cascade.

---

# Phase 2 — Hazard counterplay

**Goal:** convert "that felt unfair" into "I saw it coming and misplayed it".

Every hazard is currently `timer -= dt; if (timer <= 0) punish()` (`index.html:3519`–`3595`).

### 2.1 Telegraphs

The `alertsArea` block already exists in the HUD, so the UI cost is near zero.

- [x] **Choking** — at `chokeTimer < CHOKE_WARN_SECONDS` (1.5s), `Audio.cough()` fires once
      (`chokeWarned` latch) and mood shows `😮` until the choke actually starts
- [x] **Oven** — `#ovenAlert` banner shows the moment `targetIsOven` is set in `pickBabyTarget()`,
      synced to guests via `targetIsOven` in `pushWorldSnapshot()`/`applyRemoteBabies()`
- [x] **Back pain** — `#backPainAlert` gets a `.warn` amber state once `nextBackPain <
      BACKPAIN_WARN_SECONDS` (6s), before the spasm actually locks Dad in place
- [x] **Bathroom** — `#bathroomAlert` gets the same amber treatment once `nextBathroom <
      BATHROOM_WARN_SECONDS` (8s), before the urge window opens
- [x] **Vomit** — the culprit baby is pre-selected `VOMIT_WARN_SECONDS` (2s) before the mess
      spawns and goes `queasy` (🤢 mood); cleared on pickup too so a held baby can't stay queasy
- [x] **Package / work ping** — `Audio.doorbell()` (descending sine) vs the existing ascending
      `Audio.chime()` for work pings — distinguishable without reading the HUD

### 2.2 Preventive verbs

Things worth spending time on to reduce future risk.

- [x] **Baby-proof the oven** — `E` on the oven (no active oven chore task) spends
      `OVEN_PROOF_COST` (8) 💩, sets `S.ovenProofed`, which gates the oven-target roll in
      `pickBabyTarget()` for the rest of the run
- [x] **Preemptive toilet** — `doStation('toilet')` no longer just errors with no active urge;
      it now pushes `P.nextBathroom` out by half the difficulty's minimum interval and chimes
- [x] **Stretch at the bed** — `E` on the bed (no active bed chore task) spends `stretchCost(P)`
      💩 and rerolls `P.nextBackPain`
- [x] Reworked the `backpain` upgrade: still shortens back-pain episodes, but each level also
      discounts `stretchCost()` by 20% (compounding), so it synergizes with the new active verb
      instead of just taxing episode length passively
- [x] **Tidy small objects** — `E` near toys (always available, not gated behind Chores Mode)
      adds `TOY_TIDY_CHOKE_BONUS` (12s) to every baby's `chokeTimer`, on a `TOY_TIDY_COOLDOWN_SECONDS`
      (20s) cooldown to stop spamming it; still completes the Chores Mode `toys` task when active

**Acceptance:** every hazard has a visible warning and at least one action that reduces its
frequency or impact. No hazard can fire with zero prior signal.

**Verification note:** all code paths were re-traced end-to-end (station handlers, prompt hints,
tick() telegraph timers, multiplayer sync, mood ternary) and the inline scripts pass a syntax
check. Live in-browser confirmation covered the choke hazard's full cycle, the shop's updated
Pain Medication/Blackout Curtains copy, and tutorial poo-granting. The remaining preventive verbs
(oven baby-proofing, bed stretch, preemptive toilet, toy tidy) and the exact telegraph windows
could not be exercised live this session — the browser tooling's tab repeatedly reports
`document.visibilityState === 'hidden'` regardless of focus, which throttles/stalls the game's
`requestAnimationFrame` loop entirely (same root cause as the sleep-fix verification gap in
Phase 1). Worth a manual playthrough on your end to confirm feel, same caveat as before.

---

# Phase 3 — Day phases

**Goal:** give the run a shape. `decayMul` is constant for the whole run, so every second feels
like every other second.

> **Update (2026-08-02):** the third phase was originally "Nap Time," tied to the sleep need's
> noise-tolerance mechanic. Phase 1 (sleep) was reverted after repeated bugs — see its note above —
> so this phase was renamed **Afternoon** and lost its `noiseMul` knob, but otherwise kept: the
> notification-clustering effect (`notifyMul:2.5`) was always the more load-bearing half of its
> identity and stands fine on its own. Table and notes below updated to match.

- [x] Added a `PHASES` table with per-phase multipliers, layered over `curDiff()` via `phaseMul(key)`
      (defaults to a neutral 1× for any key a phase doesn't override — see `PHASE_DEFAULTS`)

  | Phase | Character | Implementation |
  |---|---|---|
  | 🌅 Morning | Needs drain fast, no work pings | `decayMul:1.15`, `notifyMul:0` (new pings fully suppressed — an already-active one can still be missed) |
  | 🍽️ Lunch | Food drains 2×, oven hazard live | `foodDecayMul:2`, `ovenMul:3.2`, `notifyMul:0` (still suppressed — no interruptions over lunch) |
  | 🕑 Afternoon | A breather, but work pings cluster here | `decayMul:0.85`, `ovenMul:0.4`, `notifyMul:2.5` (everything Morning+Lunch suppressed fires here, clustered) |
  | 🌆 Evening | Everything at once, mom's 60s out | `decayMul:1.3`, `ovenMul:1.4`, `notifyMul:1.2`, `cryFillMul:1.2`, plus `vomitMul`/`chokeMul`/`fallMul`/`backpainMul`/`bathroomMul` all `1.3` — always exactly the run's last 60s of real time, not a proportional quarter |

  Boundaries are absolute seconds (`PHASE_MORNING_SECONDS`=70, `PHASE_LUNCH_SECONDS`=60,
  `PHASE_EVENING_SECONDS`=60), not fractions of `gameLen` — Morning/Lunch/Evening feel the same
  length regardless of difficulty, and Afternoon absorbs whatever time is left between Lunch and
  the fixed-length Evening (so King's longer `gameLen` gets a longer afternoon, not a longer everything).
- [x] HUD banner (`#phaseBanner`, calm fade not urgent flash) on transition, plus a persistent
      phase indicator (`#phaseStat`, icon+label) next to the survival/countdown timer
- [x] Endless mode cycles the phases indefinitely — `phaseBoundaries()` returns a synthetic
      `cycleLen` (using a flat `PHASE_AFTERNOON_ENDLESS_SECONDS`=90 in place of "whatever's left
      before the end") when `gameLen` is `Infinity`, and `phaseIndexAt()` always works modulo that
      `cycleLen`, so the same lookup function drives both timed and endless runs
- [x] Chores Mode: added `TASK_PHASE_AFFINITY` (which phase each of the 6 chores is thematically
      "in season" during — e.g. `oven→lunch`, `toys→afternoon`) and used it to sort the current
      phase's matching chore to the top of the checklist with a ⭐, rather than changing *which*
      chores get picked. Chosen deliberately over regenerating/reweighting the actual task list
      mid-run, since task identity is generated once from the shared seed and multiplayer sync only
      ever transmits done-flags (`tasksDone` in `pushWorldSnapshot()`) — swapping task identity live
      would have broken that invariant and required new sync plumbing for a fairly small payoff
- [x] Multiplayer: `phaseIdx` added to `pushWorldSnapshot()`/`applyRemoteWorld()` (as `-1` for "no
      phase" over the wire, since Realtime Database can't carry `null` cleanly); guests detect the
      transition themselves from the incoming value and show the same banner+chime locally
- [x] Rebalance: the multipliers above are new, reasonable-by-design numbers layered on top of the
      already-tuned Phase 1 base difficulty curve, not the product of an empirical playtest pass —
      real-time verification is blocked by the same browser-tooling limitation noted below. Worth a
      manual playthrough per difficulty to confirm Evening actually feels "frantic" rather than
      "unfair" once several ~1.3× multipliers compound together.

**Dependency:** landed after Phase 1's retune, not before — this multiplies the same knobs.

**Acceptance:** the same 285 seconds produce four distinct feels. Afternoon is a genuine
breather; Evening is genuinely frantic.

**Verification note:** live-confirmed the phase indicator and transition banner both render
correctly for the very first Morning transition (in both a normal run and a Chores Mode run), with
the correct phase-appropriate copy and no console errors; confirmed the Chores checklist correctly
shows *no* ⭐ when none of the run's 4 random chores match the current phase (a real negative case,
not just an untested assumption). Verifying Evening's compounded hazard multipliers, the Afternoon
notification cluster, and the endless-mode cycle repeating required either fast-forwarding real
time or forcing `S.elapsed` directly — blocked by the same `document.visibilityState==='hidden'`
tooling wall noted in the Phase 2 and Phase 4 verification notes, since there's no dev-panel control
to jump the phase directly. Confirmed via code trace instead.

---

# Phase 4 — Scoring & the run summary

### 4.1 Care streak

`S.score = floor(elapsed) + poo*3` (`index.html:3626`) rewards surviving, not caring well.

- [x] `S.streak` accumulates (in seconds) while every need on every baby stays above
      `STREAK_HEALTHY_THRESHOLD` (60); resets to 0 the instant any need on any baby dips to or
      below that floor
- [x] Multiplier `1 + min(2, streak/STREAK_SCORE_CAP)` (cap 60s → up to +200%) applied to the
      endless-mode score: `S.score = floor((floor(elapsed) + poo*3) * streakMul)`
- [x] `S.longestStreak` tracked every tick (any mode, not just endless) for the summary card
- [x] HUD indicator (`#streakStat`) next to the score stat, shown/hidden together with it (endless
      mode only, matching where score itself is shown)

This creates a real tension with the diaper mechanic: pushing the diaper to 0% for 4× poo
deliberately breaks your streak. The leaderboard schema is unchanged — still a single number, so
`submitLeaderboardScore()` needs no migration.

### 4.2 Run summary card

`endGame()` reported two stats before this pass; the code already tracked `cuddles`, `changes`,
`missedCount`, `missedPackages`, and `elapsed`.

- [x] `S.cry` is sampled every `CRY_HISTORY_INTERVAL` (2s) into `S.cryHistory`, rendered as a
      filled sparkline (`drawCrySparkline()`) on both end cards via a small dedicated canvas
      (`#goSparkline`/`#winSparkline`) — separate from the house `drawMinimap()` canvas, since the
      two draw completely different things
- [x] Counters for hazards survived by type (`S.hazardCounts` — choke/burn/fall/vomit/backpain/
      bathroom), shown as an icon row (`hazardSummaryLine()`)
- [x] Longest calm streak and naps taken (`S.napsCount`, incremented at the crib) shown on the card
- [x] **Copy Result** button (`wireCopyResultBtn()`) builds a plain-text summary — difficulty,
      outcome, score (endless only), streak/naps/poo/changes, hazard tally, and the bare page URL
      (stripped of query/hash) — and copies it via the existing `fallbackCopyText()` clipboard
      fallback, same pattern as the multiplayer room-code copy button
- [x] Applied to both the win and game-over cards (`renderRunSummary('win'|'go')`)
- [ ] ~~Phase reached~~ — dropped from this pass: "phase reached" refers to Phase 3 (Day phases),
      which hasn't been implemented yet (this round jumped straight from Phase 2 to Phase 4 on
      explicit instruction). Revisit once Phase 3 exists.

**Acceptance:** the end card explains *how* the run went, not just that it ended.

**Known limitation:** hazard counts, naps, and the calm streak are tracked per-client, not synced
through `pushWorldSnapshot()`. Baby-driven hazards (choke/burn/fall/vomit) are only counted on the
host, since that logic already only runs host-side; back-pain/bathroom are counted correctly per
player since that logic already runs locally on every client. In multiplayer, a guest's own
end-card will under-count the baby-driven hazard types. Syncing would require distinguishing
"whose count is authoritative" per hazard type rather than just overwriting one client's numbers
with another's, so it was left as a follow-up rather than shipping a sync that makes guest numbers
actively worse. Same category of gap as the existing "movement noise only from the host's own
position" multiplayer simplification from Phase 1.

**Verification note:** live-tested via the dev panel's instant Win/Lose/Fired buttons (synchronous,
not rAF-gated) — both end cards render the sparkline canvas, hazard-icon row, and streak/naps line
correctly, and the Copy Result button was confirmed to actually write to the clipboard (not just
flash its own label) via `navigator.clipboard.writeText` + a readback check. The endless-mode HUD
was confirmed too: Score and the new Streak stat both appeared correctly on the one frame that
rendered before the loop stalled. Natural, real-time verification of the streak accumulating over
a live run, the sparkline filling in with real samples, and hazard counters incrementing from
actual gameplay was blocked by the same `document.visibilityState === 'hidden'` tooling wall noted
in the Phase 2 verification note — worth a manual playthrough to confirm the numbers feel right.

---

# Phase 5 — Daily seed challenge

**Depends on 0.2.** `mulberry32` (`index.html:833`), `buildHouse(seed)` (`index.html:1643`), and
the Firebase leaderboard all already exist — this is the highest retention-per-line item in the
plan.

- [x] Seed derived from the UTC date (`dailyDateKey()` → `hashStringToSeed()` → `dailySeed()`, a
      djb2-style hash so no external dependency is needed). `buildHouse(seed)` already derives both
      `houseRng` (layout) and `runRng` (hazard timing) from one shared integer, so passing the same
      date-derived seed gets both for free — identical house *and* identical hazard timing
- [x] `dailyLeaderboard/<dateKey>` — its own Firebase path, sibling to `leaderboard`
      (`dailyLeaderboardPath()`/`submitDailyScore()`/`fetchDailyLeaderboardTop()`/
      `renderDailyLeaderboard()`, same shape as the endless functions minus the difficulty-icon
      column, since difficulty is fixed and shared for the whole day rather than player-chosen)
- [x] One attempt per day via `localStorage` (`babycare_daily_<dateKey>`, same try/catch-guarded
      pattern as the existing high-score persistence). The Daily Challenge menu screen hides the
      Start button once a result exists for today; `startDailyChallenge()` itself also no-ops
      defensively. Trivially bypassable (clear storage / incognito) — accepted tradeoff per the spec
- [x] Menu entry (`#dailyScreen`, reached via a new `📅 Daily Challenge` main-menu button) shows
      today's UTC date, the day's rotating difficulty, a live countdown to the next UTC reset
      (`msUntilNextUtcMidnight()`, refreshed every second while the screen is visible), the day's
      top scores, and — if already played — the stored result instead of a Start button
- [x] Fixed difficulty per day, rotating through `DAILY_DIFFICULTY_ROTATION = ['first','veteran',
      'king']` keyed off whole UTC days since an arbitrary fixed epoch (`dailyDayIndex()`/
      `dailyDifficulty()`), so every player sees the same difficulty on the same day regardless of
      their own last difficulty selection — the mode/diff pickers are bypassed entirely, the same
      way the Tutorial entry point already bypasses them
- [x] A daily run is scored the same way Endless Mode is (`S.score` now computed whenever
      `S.endless || S.dailyChallenge`, streak multiplier included) even though it's a normal
      fixed-length timed run underneath — `S.timeLeft` still counts down and a full survival is a
      real `'win'`, unlike Endless. That meant the score-submit UI (previously gameover-card-only,
      since only a lose/fired/hide could end an endless run) needed to exist on the **win** card
      too — generalized both into shared `scoreSubmitState()`/`applyScoreSubmitUI(prefix, state)`/
      `wireScoreSubmitForm(prefix)` helpers rather than duplicating the endless-only logic twice
- [ ] Firebase database rules rejecting implausible scores — **not applied**, see note below

**Acceptance:** two players on the same day face a byte-identical run — satisfied structurally by
construction (shared seed → shared `houseRng`/`runRng`), not by a live two-browser test (see
verification note).

**Firebase rules — a manual step, not something this session could do:** there's no
`database.rules.json` (or any rules file) checked into this repo — the project's Realtime Database
rules live only in the Firebase console, which this agent has no access to. Rather than invent a
full replacement ruleset blind (risking silently locking out the already-working `rooms` and
`leaderboard` paths this project depends on), here's a validation snippet to **merge into your
existing rules** under a new `dailyLeaderboard` key, leaving everything else untouched:

```json
"dailyLeaderboard": {
  "$date": {
    ".read": true,
    ".write": true,
    "$entryId": {
      ".validate": "newData.hasChildren(['name','score','ts'])",
      "name": { ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 16" },
      "score": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 5000" },
      "ts": { ".validate": "newData.isNumber() && newData.val() <= now + 300000 && newData.val() >= now - 300000" },
      "$other": { ".validate": false }
    }
  }
}
```
The `score <= 5000` ceiling is a generous sanity bound (a daily run is time-boxed to King's 345s
`gameLen`, and `score = elapsed + poo*3`, streak-multiplied up to 3x — 5000 comfortably covers any
legitimate result with headroom) rather than a precisely-modeled cap; the goal is rejecting
obviously-fabricated writes, not perfectly policing gameplay. Apply it via the Firebase console's
Rules tab (or `firebase deploy --only database` if the CLI is set up) — merged in, not pasted over
the whole file.

**Verification note:** this one got a real end-to-end live test against the actual production
Firebase project (no staging backend exists), not just a code trace. Confirmed: (1) the same UTC
date reproduces the identical seed across a full page reload (`Run seed:` readout unchanged), (2)
the daily HUD shows Score + Streak next to the normal "Mom back in" countdown, (3) a completed run
correctly writes to `dailyLeaderboard/<dateKey>` and the menu's "already played" state picks it up
afterward with the Start button hidden. Caught and fixed one real bug in the process: `endGame()`
was calling `setDailyResult()` *before* `scoreSubmitState()` checked "already played today" via
that same stored result, so the just-finished run always saw itself as already recorded and never
offered the submit form — reordered so the check runs first. Also caught a UX rough edge live: the
game-over card's `goStepnav` normally shows both "Quit to Menu" and the primary button, but for a
daily run the primary button *also* now goes to the menu (see above), making two menu-bound
buttons redundant — `goQuitBtn` is now hidden specifically for `S.dailyChallenge`. Since this test
writes to the real leaderboard, the test entry was deleted afterward via the same `fbDb` reference
— the leaderboard was confirmed empty again before finishing. Not independently tested: the win-card
score-submit path (code-identical to the game-over one via the shared `prefix`-based helpers, just
not separately exercised since triggering an actual survival-length win wasn't practical in this
session), and a genuine second-device/second-browser confirmation of "two players, same day, same
run" (verified structurally via the shared-seed mechanism instead, per the acceptance note above).

---

# Phase 6 — Baby personality

**Goal:** stop runs feeling interchangeable. `pickBabyTarget()` is a coin-flip between a random
toy and a random point.

> **Note:** two of the originally-planned traits ("Light sleeper," "Night owl") depended on the
> sleep need, which was removed in Phase 1's revert (see that phase's note). Replaced with
> **Diaper Machine** and **Cuddle Bug** — see below — to keep a 6-trait roster built entirely on
> systems that still exist.

- [x] Roll 1–2 traits per baby per run from the seeded RNG (`rollBabyTraitSets()`), via a
      precomputed list of all 21 possible 1-and-2-trait combinations (`TRAIT_COMBOS`) shuffled with
      `shuffle()`/`random0to1()` — same reproducibility guarantee as everything else keyed off
      `houseRng`/`runRng`. **Skipped during the tutorial** (forced to `[]`) since it's a fixed,
      hands-off script and a trait like Clingy would fight the "nothing here can end the game"
      promise.
- [x] Traits (`BABY_TRAITS`, all built on existing systems — no new mechanics invented):
  - 🥺 **Clingy** — counts as crying (and adds to `totalEmpties`'s cry-fill magnitude) whenever
    Dad is more than `CLINGY_DISTANCE` (9 units) away, via a shared `clingyDistressed(b)` helper
    used by both `updateBabyAI()`'s mood/cry logic and `tick()`'s cry-o-meter aggregation
  - 🧗 **Climber** — `CLIMBER_OVEN_MUL` (2.2×) on the oven-approach roll and `CLIMBER_FALL_MUL`
    (0.55×) on the fall-timer range in `pickBabyTarget()`, plus `CLIMBER_PEN_MUL` (0.55×) on
    playpen dwell time
  - 🥣 **Picky Eater** — toggles `pickyRefusing` on a random cycle (`PICKY_ACCEPT_*`/
    `PICKY_REFUSE_*` seconds); `deliverToBaby()` rejects food (not milk) while active, with a
    dedicated 🙅 mood and prompt-hint ("won't touch food right now — try milk")
  - 🧸 **Favorite Toy** — one real toy instance is picked at spawn (`b.favoriteToyRef`);
    `pickBabyTarget()` prefers it `FAVORITE_TOY_PICK_CHANCE` (60%) of the time when heading to a
    toy, and playing with it specifically doubles the joy-gain rate (`FAVORITE_TOY_JOY_MUL`)
  - 🧷 **Diaper Machine** — `DIAPER_MACHINE_DECAY_MUL` (1.6×) on diaper decay,
    `DIAPER_MACHINE_POO_MUL` (1.4×) on poo earned per change — more frequent hassle, more reward
  - 🥰 **Cuddle Bug** — builds `S.joy` at `CUDDLE_BUG_JOY_RATE` (0.4/s) just from being held, which
    eases the cry-o-meter globally (joy factors into both the fill-rate reduction and drain bonus)
- [x] Trait icons shown on the baby's HUD cluster (`buildBabyNeedsHUD()`, a `.traitBadges` row with
      a hover tooltip listing full name+description) and on the end card (`babyTraitsSummaryLine()`
      — name + icons per baby with any traits, included in `renderRunSummary()` and the Copy Result
      share text)
- [x] Multiplayer: traits are seed-derivable (verified — see below) but synced anyway as a safety
      net, same reasoning as why `name` already syncs despite being equally derivable — added
      `traits`/`pickyRefusing` to the `bSnap` payload in `pushWorldSnapshot()`/`applyRemoteBabies()`
- [x] Multi-baby rounds: `rollBabyTraitSets(count)` shuffles the full 21-combo list and hands out
      the first `count` entries — guarantees no two babies share an identical trait set for any
      count up to 8 (the multiplayer baby-count cap), rather than risking duplicates from
      independent per-baby rolls

**Acceptance:** two runs on the same difficulty play differently because the baby is different.

**Verification note:** live-confirmed the trait badge renders correctly with the right tooltip;
confirmed the exact same seed (via the dev panel's seed override) reproduces the identical trait
combination across a full page reload (`Climber + Diaper Machine` both times) — satisfies the
"verify this holds" item without needing an actual two-client multiplayer session, since the
underlying mechanism (`houseRng`/`runRng` from one shared integer) is the same one already proven
for the daily challenge's house layout. Confirmed the end-card traits line renders correctly
("Theo 🧗🧷"). The 21-combo uniqueness guarantee for 8 babies was verified with a standalone Node
script exercising the same `mulberry32`/`shuffle`/`rollBabyTraitSets` logic outside the browser
(all 8 slots came back unique). Not live-tested in an actual running game: the Picky Eater
food-refusal toggle actually firing over real time, and Climber's oven/fall/playpen multipliers
actually changing hazard frequency — both are straightforward code, traced but not observed live.

**Follow-up fixes (2026-08-02), from user-reported issues after playing this phase:**
- 🐛 **Trait tooltip was dead on arrival.** The hover tooltip added for `.traitBadge` inherited
  `pointer-events:none` from its `#hud`/`#topbar` ancestors (the whole HUD is click-through by
  design, so the 3D scene underneath stays interactive) — meaning the badge could never actually
  receive a real mouse hover, `:hover` would never match, and the tooltip could never show. Caught
  live: `document.elementFromPoint()` at the badge's own coordinates returned nothing until
  `.traitBadge{pointer-events:auto}` was added, following the same opt-back-in pattern every other
  interactive HUD element (`.btn`, `.diffOpt`, `.colorSwatch`, `.menuBtnBig`) already uses.
- 🍎🍽️ **Kitchen counter stations could land almost on top of each other.** `buildKitchen()` picked
  food/sink/cabinet/fridge positions as independent random fractions (`t`) along the counter wall,
  with no minimum enforced in real-world units — on a small room, the worst case put food and sink
  centers as close as ~0.4 units apart (well inside the 2.6-unit interaction radius both share),
  making it nearly impossible to target one specifically without `nearestStationAt()`'s
  nearest-wins tiebreak picking the other. Fixed with an adaptive `kitchenGapT`, derived from the
  wall's actual usable length (`room.maxX-room.minX-2` or the Z equivalent), that each subsequent
  station's fractional position is clamped against. Verified with a 200,000-trial standalone script
  sweeping the full room-size range (9–12 × 10–14): worst-case gap improved from ~0.4 to ~1.56
  units, comfortably enough to target each station individually.

---

# Phase 7 — Meta-progression

**Goal:** make losing pay something. `upgradeCost = base * (lvl+1)` (`index.html:2170`) is
uncapped, and every level evaporates at run end.

**Note:** "naps" in the original lifetime-stats list was a Phase 1 (sleep/crib) reference —
sleep was later removed from the game entirely (see Phase 1's own note). Swapped for "baths
given," which plays the same role now that Phase 9 added a real bath mechanic.

- [x] Persistent profile in localStorage (`PROFILE_KEY = 'babycare_profile_v1'`, `getProfile()`/
      `saveProfile()`): lifetime XP, runs played, runs survived, diaper changes, cuddles, baths
      given, hazards handled, and the chosen solo cosmetic color
- [x] **Dad Level** derived from lifetime XP — `dadLevelForXp()`, a quadratic threshold curve
      (`xpThreshold(lvl) = 60*lvl²`) capped at level 20. Every real run banks XP via
      `applyRunToProfile()` (called from `endGame()`, skipped only for the tutorial): diaper
      changes, cuddles, baths, and hazards handled each score points, plus a small amount per
      second survived, plus a flat bonus on a win — so even a loss always earns *something*
- [x] Unlocks, all solo/tutorial/daily-only (never multiplayer — see below): a starting 💩 bonus
      (`startingPooBonus()`, +1/level up to a cap of 10, applied in `startGame()`), a rising
      upgrade-level cap (`upgradeCapForLevel()`, +1 every 4 Dad Levels up to a cap of 6), and more
      unlocked `PLAYER_COLORS` outfit slots (`unlockedColorCount()`, +1/level from a base of 5)
- [x] **Cap the upgrade levels** — `buyUpgrade()`/`refreshShop()` now check `upgradeCapFor()` and
      refuse/grey-out a maxed-out upgrade; the shop's level label reads "Level X / cap"
- [x] Profile screen (`#profileScreen`, "👤 Profile" on the main menu): Dad Level badge, an XP
      progress bar to the next level, the lifetime-stats grid, the current solo upgrade
      cap/starting-💩 note, and a color-swatch grid for the solo cosmetic (locked swatches show
      "Unlocks at Dad Level N" as their title, dimmed via the same `.taken` look the multiplayer
      lobby's color picker already used)
- [x] End card shows XP earned, including on a loss — a new `#winXp`/`#goXp` summary line reads
      "⭐ +N XP" or, on a level-up, "⭐ +N XP — Dad Level M! 🎉"
- [x] Multiplayer: cosmetics still sync via the existing `colorIdx` mechanism (the profile's
      chosen color only seeds solo/tutorial/daily's `freshPlayer()` call — `beginMultiplayerRound()`
      already restores the room-assigned `colorIdx` right after, untouched); perks
      (`upgradeCapFor()`/`startingPooBonus()`) check `roomCode` and fall back to the unmodified
      base values in any multiplayer room, host or guest, so a higher Dad Level never advantages
      one player over another in a shared round

**Multiplayer stat-attribution fix (needed for the above to be correct for guests):** hazard
clears and completed baths were briefly tracked as shared `S.hazardsHandled`/`S.bathsGiven`
counters, but per-player fields (`P.hazardsHandled`, `P.bathsGiven`, mirroring the pre-existing
`P.changes`/`P.cuddles`) turned out to be necessary — and while implementing that, found that
`P.changes`/`P.cuddles` were *already* never synced back down to a guest's own client (`poo`/`lvl`
were, via `pushWorldSnapshot()`'s per-player update and `applyPlayerSnapshot()`'s `id===myId`
branch, but not those two) — a pre-existing gap, not something this phase introduced, but one that
would have made every guest's own profile XP undercount every round. Fixed by extending that same
sync path to all four fields. `bathsGiven` is credited to `players[b.heldBy]` (whoever's actually
holding the baby when the bath timer completes) rather than the acting player, since bath
completion fires from the host's own per-tick simulation loop, not from a dispatched action.

**Acceptance:** a failed run visibly advances something (confirmed live — see below). Upgrade
levels are bounded (confirmed live — see below).

**Verification note:** live-tested via the dev panel's instant Win/Lose buttons (synchronous, so
unaffected by this session's recurring stuck-tab `requestAnimationFrame` throttling — see Phase 9's
note for that issue; the Profile screen and shop are pure click-driven DOM too, so also unaffected).
Confirmed end-to-end in the browser: the Profile screen renders Level 1 with a 0/240 XP bar and
exactly 6 unlocked outfit colors (the rest dimmed, each with the correct "Unlocks at Dad Level N"
title); picking an unlocked color persists to localStorage and instantly re-tints Dad, and that
color is still applied when a fresh solo run starts; the shop shows "Level 0 / 3" on every upgrade
at Dad Level 1; an instant dev-panel Loss banks `+0 XP` (nothing had happened yet) and increments
`runsPlayed`, shown correctly on the loss card; an instant Win banks `+50 XP` and increments
`runsSurvived`; manually nudging stored `xp` to just under a level-2 threshold and winning again
correctly crossed it, showing "⭐ +50 XP — Dad Level 2! 🎉" on the win card, and the Profile screen
immediately reflected Level 2, a 45/300 bar, "Starting 💩: 1", and 7 unlocked colors. Not
independently live-tested: earning XP through *organic* gameplay (actually changing a diaper,
giving a bath, etc., rather than the dev panel's instant end buttons) — blocked by the same stuck
`visibilityState` issue that blocked Phase 9's movement testing — and the multiplayer sync fix
above (would need a second connected client to observe).

---

# Phase 8 — Audio & accessibility

### 8.1 Audio

- [ ] **Adaptive music** — the two MP3s play at a flat `volume: 0.14` (`index.html:1928`). Drive
      volume and `playbackRate` off `S.cry`. Panic is currently communicated by a red bar and
      nothing else
- [ ] **Real cry audio** — `Audio.cry()` (`index.html:1917`) is a single sawtooth oscillator. A
      sampled cry would do more for the game's identity than most mechanics in this plan
- [ ] **Giggle on play** — joy is presently silent (`updateBabyAI`, the `b.play > 0` branch)
- [ ] Snoring loop while a baby sleeps, which doubles as the audio cue for Phase 1's noise system
- [ ] Separate music and SFX volume sliders in Settings

### 8.2 Camera

- [ ] 90° rotation on `[` / `]`. `CAM_OFFSET` is a single fixed vector (`index.html:749`), so
      this is cheap. The wall-fade at `index.html:3409` is a smart workaround, but rotation is
      standard isometric grammar
- [ ] Remap the movement basis vectors `FWD` / `RIGHT` (`index.html:2196`) per rotation step
- [ ] Persist the preference

### 8.3 Accessibility

- [ ] Key rebinding, persisted to localStorage
- [ ] Colourblind-safe need bars — they are pure colour fills today. Add numeric labels or patterns
- [ ] `prefers-reduced-motion` path: disable the cry wobble, the toy bob, and screen shake
- [ ] HUD scale option
- [ ] Verify contrast on the cry-o-meter and alert boxes

**Acceptance:** the game is playable and legible without relying on colour or fine motion.

---

# Phase 9 — Bath & the dirty meter

**Goal:** give the bathroom a reason to exist beyond the mop, and close the loop on vomit and
diapers. The bathtub and shower were decorative, and `buildBathroom()` picks one based on room area.

> **Note:** the original dependency note ("after Phase 1 — it reuses the carry-to-station-and-wait
> pattern that the crib establishes") no longer applies — the crib/sleep mechanic was reverted (see
> Phase 1's note). Built fresh instead on the closest surviving analog: the playpen's
> carry-then-timer pattern for the *baby* side, and back pain's movement-freeze pattern for the
> "Dad is pinned" side. "High dirtiness... blocks naps" was dropped for the same reason (no naps to
> block) — high dirtiness accelerating the cry-o-meter is the effect that survived.

- [x] `b.dirty` (0-100) per baby, fed by three sources: `DIRTY_VOMIT_ADD` (40) in one shot when a
      baby is the vomit culprit; `DIRTY_DIAPER_RATE` (2.2/s) while `need.diaper <=
      DIAPER_CHANGE_MAX` (a change is overdue, regardless of held/penned state); `DIRTY_CRAWL_RATE`
      (0.6/s) while unattended on the floor (unheld, unfallen, unburned, unpenned, unchoking — the
      same branch `pickBabyTarget()`/crawl-vs-walk AI already runs in). All three scale by a new
      per-difficulty `dirtyMul` (0.7/1/1.4 for First/Veteran/King, 0 for the tutorial — nothing
      accrues on its own there; the one tutorial step force-sets it instead, same as the diaper step)
- [x] `stations.bath` — registered manually (same reasoning as the oven/bed/sink: `addPropOriented`
      already gives it a correctly *oriented* collision box, so `addStation()`'s generic circular
      one would be wrong for a non-square tub) on whichever of tub/shower `room.area` picked.
      `doStation('bath')` requires `P.holdingBaby>=0` and starts `b.bathTimer = BATH_SECONDS` (6) —
      the baby stays in Dad's arms the whole time, unlike the playpen which detaches it
- [x] "Dad is pinned": a new `bathing` flag (`P.holdingBaby>=0 && babies[P.holdingBaby].bathTimer>0`)
      folds into the same `crippled` check back pain already uses to block movement — computed from
      the *baby's* synced `bathTimer`, not a player field, so the freeze lands on whichever client
      (host or guest) is actually holding the baby. Hold-stamina drain is also paused while bathing
      (braced against the tub isn't the same strain as carrying the baby around, and King's 5s
      `holdBase` would otherwise interrupt almost every bath before it finished)
- [x] `b.dirty >= DIRTY_CRY_THRESHOLD` (70) folds into `tick()`'s cry-o-meter aggregation exactly
      like `clingyDistressed()` already does — counts as an empty need for both the fill-trigger and
      the fill-magnitude math. A `wet` baby (post-bath, pre-towel) applies a smaller `WET_CRY_MUL`
      (1.15×) multiplier on top, whenever the fill branch is already active — a compounding
      annoyance, not a standalone trigger
- [x] Towel rack converted from decoration (`addWallDecor`) to `stations.towel`, placed in the
      *opposite* wall corner from the bath (`edgeT()` alone could land in the same corner and end up
      too close to target precisely — the same class of bug just fixed for the kitchen counter).
      `doStation('towel')` requires holding the baby and `b.wet`; clears it and chimes
- [x] `DIFFICULTIES.dirtyMul`, `pushWorldSnapshot()`/`applyRemoteBabies()` sync for
      `dirty`/`wet`/`bathTimer`, a `TASK_POOL` entry (`bath`, evening affinity — the other exception
      alongside `toys` that needs a precondition, here `holdingBaby>=0`, before it's completable),
      and a tutorial step (dirties the baby via `onEnter`, waits on `tutorialProgress.toweled` so it
      teaches the *whole* bath→towel loop, not just the bath half)
- [x] HUD: a 5th mini-bar (🧼, `.needMini[data-k=dirty]`) with inverted semantics from the other
      four — fills up as it gets worse rather than down, flashes at `DIRTY_CRY_THRESHOLD` instead of
      the usual "critically low" — plus prompt hints for both stations and a new Help screen section

**Acceptance:** all six rooms have a live gameplay purpose.

**Verification note:** partial live pass, backstopped by a full code re-trace. Live-confirmed via
the tutorial: stepping to the new bath step shows the correct text and is reachable in the right
order (between playpen and messes), and the HUD's 🧼 dirty mini-bar actually renders at 80% width
with the `low` class applied, matching the step's `onEnter:()=>{ babies[0].dirty=80; }`. Could not
live-test the walk-to-bath→press-E→countdown→towel sequence itself — the browser tab got stuck
reporting `document.visibilityState==='hidden'` (with `document.hasFocus()===true`) and wouldn't
clear via re-fronting or resizing, which fully stalls the `requestAnimationFrame` loop (confirmed
`tick()` is rAF-driven, not interval-driven), not just decay timers — the same recurring tooling
limitation noted elsewhere in this file. Backstopped with a careful re-read of the actual shipped
code rather than the original diff: `nearestStationAt`→`interact()`→`doStation()` correctly reaches
the `k==='bath'`/`k==='towel'` handlers within the shared 2.6-unit radius; `tick()`'s
`crippled = P.backPainTimer>0 || bathing` correctly gates both `moving` (blocks position updates,
not just animation) and `bendTarget` (hunched pose); the bath-completion block sets `dirty=0`,
`wet=true`, completes the `bath` task, and sets `tutorialProgress.bathed` on the host-only branch
(solo/tutorial is always `isHost=true`, so this always runs); the towel handler correctly guards on
`b.wet` and sets `tutorialProgress.toweled`; and all four prompt-text branches (holding+bath,
holding+towel, empty-handed+bath, empty-handed+towel) match the corresponding `doStation` guards.
No logic bugs found in the trace. Still genuinely unverified: the felt timing/pacing of the
freeze-and-countdown in actual play.

---

# Phase 10 — Competitive multiplayer

**Goal:** the netcode is solid and host-authoritative, but every mode is co-op. New modes reuse
the entire existing stack.

- [ ] **Poo Race** — most 💩 banked when the timer ends. Per-player score already exists on the
      player record
- [ ] **Hot Potato** — the baby must change hands every N seconds or the holder takes a cry penalty
- [ ] Mode picker in the lobby alongside the existing difficulty and baby-count pickers
      (`mpDiffPicker`, `mpBabyCountPicker`)
- [ ] Per-player scoreboard on the end card; `updateMpPlayerHud()` (`index.html:3676`) already
      renders a live roster
- [ ] Sync the competitive mode in room meta so late-joiners see it
- [ ] Guard against the host advantage: the host runs the sim, so verify guests are not
      systematically disadvantaged on reaction-timed actions

**Risk:** the highest-latency-sensitivity work in the plan. The current 0.12s sync interval
(`index.html:3658`) is fine for co-op and may not be fine for a race.

**Acceptance:** a competitive round is fair between host and guest.

---

## Explicitly deferred

Out of scope for this round, planned for a future one:

- **Mobile / touch controls.** `index.html:5` sets `user-scalable=no` and an apple-touch-icon
  ships, but there is not one touch handler in the file — every input is a keydown
  (`index.html:2181`). When this is picked up, the entry point is a virtual stick plus a single
  context button mirroring `interact()`, which already computes `nearestStation`, `nearestBaby`,
  and `nearestMess`.
- **Gamepad support.** Same shape of change — an input-abstraction layer over the `keys` map
  serves both, and is worth building once rather than twice.

Phase 8.3's key-rebinding work should introduce that input-abstraction layer with both of these
in mind, even though neither is implemented in this round.
