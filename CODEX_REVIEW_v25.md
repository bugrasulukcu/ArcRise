# Cross-check brief: ArcRise, everything since v25

## Current request (2026-10-13): review the effect and performance changes after `3b3568f`

Your general review (`CODEX_REVIEW_GENERAL_2026-10-13.md`) covered everything up to `3b3568f` and spot-checked `68083c8`. This round covers the commits it did not fully test. Review only these; the rest of this file is background. The safety rules below still apply.

**Scope:** `git diff 3b3568f HEAD -- arcrise.html tools/fps-bench.mjs`

| Commit | Change |
|---|---|
| `68083c8` | Returning green and gold particles (`p.home`) draw cheaply: the trail is one path with one stroke, and there is no per-particle radial gradient. The gold arrival flash, tap arc and green ring fill use layered translucent strokes instead of `shadowBlur`. |
| `8c1c81c` | The soft halo behind returning particles is a 64 px pre-rendered sprite per colour (`makeHalo`, `_haloGold`, `_haloGreen`) drawn with `drawImage`. It is skipped in LOWFX. |
| (this commit) | `tools/fps-bench.mjs`: frame-time benchmark. Headless Chrome, 390×844 at DPR 3, CPU throttled, bot plays with Ghost on, Firebase blocked. |

Earlier in this session, `28de15b` (tap arc) and `3b3568f` (gold one-by-one return) were already in your general review.

**What the effects should look like**
- **Green pickup:** the old wide burst (40 particles, 20 in LOWFX). After 0.3 s every particle steers back into the ball with a trail. The first arrival fills the energy ring.
- **Gold pickup:** the same burst (22 particles, 12 in LOWFX). Each particle has its own `homeAt` (0.28 s + shuffled index × 45 ms), so they come back one at a time. Every arrival triggers a 170 ms gold flash on the ball.
- **Tap:** a short arc (~1.5 rad) on the ball's turn side, with a soft halo in the energy colour and a thin white core. It lasts 200 ms.

**Verify**
1. **Look:** at 390 and 320 px, in High and Low graphics, the particles and flashes look soft, not like hard-edged discs. Compare a screenshot against `3b3568f`; the look should be close.
2. **Leaks:** no `p.home` particle survives (each is removed on arrival or after `homeAt + 0.7 s`). `particles` returns to its baseline after a burst, including when the run ends mid-burst or AGAIN is pressed. LOWFX still caps `particles` at 40.
3. **State bleed:** `_goldHitAt`, `_ringFillAt` and `_tapFxAt` cannot draw on the game-over screen or carry into the next run.
4. **Performance:** reproduce the numbers below with `tools/fps-bench.mjs`, and say whether the method is sound. Is headless with CPU ×4 a fair proxy? Is the stress case realistic?
5. **Hot paths:** with `PROF=1`, find the next most expensive per-frame work in a busy pickup moment, such as `triggerGoldFlash`, `spawnFlyScore`, `drawFloatTexts` or the trail. Report it with numbers; do not change it.

**Measured here** (headless, 390×844 @3, CPU ×4, 15 s, two runs each)

| Scenario | `3fa0593` (before the UX round) | `3b3568f` | `8c1c81c` (HEAD) |
|---|---|---|---|
| Normal play (bot + Ghost) | 54 fps | 57 fps | 56 fps |
| Stress (one green + one gold every 0.7 s) | 30 fps | 31 fps | 33–34 fps |

```bash
python3 -m http.server 8765 --bind 127.0.0.1          # repo root
node tools/fps-bench.mjs "http://127.0.0.1:8765/arcrise.html?debug=1" 4 15 0   # normal
node tools/fps-bench.mjs "http://127.0.0.1:8765/arcrise.html?debug=1" 4 15 1   # stress
PROF=1 node tools/fps-bench.mjs "http://127.0.0.1:8765/arcrise.html?debug=1" 4 10 1
```

To benchmark an older commit, write it to a temporary file in the repo root, for example `git show 3fa0593:arcrise.html > __old.html`, and delete the file afterwards. For the stress case on commits older than `3b3568f`, add the two `ARC_TEST` spawn helpers.

**Still open from your general review (do not fix, re-check only)**
- At 320 px, the home profile card's SCORE and DIST values run under the UPG button. That is still the case at HEAD.
- Two e2e tests (`mesafe sandığı` and `arkadaşlık:`) failed while native builds ran in parallel, then passed alone. If you see why they are timing-sensitive, say so.

**Report:** the same format as before: confirmed bugs versus suspicions, a reproduction for each, and severity. Put performance findings in their own section, with numbers.

---

You are reviewing ArcRise, a mobile arcade game, at commit `90ce218`. The previous review covered v25 (`61b5f7d`, the ×1 economy). About 70 commits have landed since then. Find bugs in them and report back. **Do not refactor, rebalance or "improve" numbers.** The numbers are deliberate design decisions. Report anything that looks wrong; do not change it.

`git diff 61b5f7d 90ce218 -- arcrise.html firestore.rules` is the review scope (~5,300 lines changed in `arcrise.html`). `DEVELOPMENT_LOG.md` (Turkish) has one entry per change, newest first, if you need the intent behind a change.

## Safety rules (read first)

- **Never let the game talk to production Firebase** (project `arcrise-e1504`). App Check is in monitor mode, so any score, wallet, friend or challenge write from a local browser reaches live players. When you run the game in a browser, block these hosts: `firestore.googleapis.com`, `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, `firebaseappcheck.googleapis.com`, `firebaseinstallations.googleapis.com`. `tools/bot-econ.mjs` and `tests/e2e.mjs` already do this.
- **Do not run `tools/seed-players.mjs`.** It writes fake players and scores to the live database by design.
- Do not run `firebase` CLI commands (no rules or index deploys), `git push`, or anything that deletes data.
- Do not start the autopilot (`?bot=1`, `ARC_BOT.start()`) without the network block above.

## The game

ArcRise is a one-touch, endless vertical arcade game for phones (portrait). **The goal is to get as far up as possible and score as high as possible in one run**, then beat your own best, your friends and the leaderboard. Coins earned from runs buy permanent upgrades, abilities, items and cosmetics.

**Controls and movement**
- A glowing ball moves forward constantly along a circular arc, rising up the screen. The player never stops it.
- **Tap anywhere** to flip the turn direction, so the ball curves the other way. That is the only input. Steering means timing taps to weave between things.
- The canvas is 600 px wide; height follows the screen. Distance is measured against a fixed `H_REF = 1066` px, so it is the same on every device. One `H_REF` screen = 15 cm (`CM_PER_SCREEN`). Typical runs are 1–3 m; 5 m is good.
- A run starts at a start line 10 cm above the spawn. Distance and score count from the line.

**What ends a run**
- Touching a **red obstacle** or a **side wall**.
- **Energy running out.** The ball shows a countdown number (8 by default, `comboDisplayMax()`); it drops about one step per second. Collecting a **green ball** refills it to the top.

**What gives score**
- Distance: 5 points per metre.
- Green balls (1), gold balls (20), purple balls (10, they also grant a temporary **booster**: wide or tight arc, magnet, ×2/×3/×4 score, ghost, shield, speed).
- Skill objects: near-miss past an obstacle (CLOSE), THREAD (pass between a spinning pair), gates, ×2 ring, breakable crystals, gold corridors, TIMING obstacles, crossing your PB line.
- Every gain is multiplied by:
  - the **time multiplier**: the countdown number when you collect (0–3 ×1, 4–6 ×2, 7–9 ×3, 10–12 ×4), so collecting early pays more;
  - the **combo multiplier**: collect greens back to back while the countdown is still in its top band (the first ~2 s after a green). The 3rd consecutive green starts ×2, then ×3 … up to the cap (×3 base, ×7 with upgrades). Missing the band resets it to ×1;
  - the active booster.

**Modes**
- **Chill** (`normal` in code): base speed 400.
- **Extreme**: base speed 800, accelerating with distance, coins per metre ×2. Unlocked by reaching a distance/score target, or bought.
- **Wife mode**: a hidden casual mode at half speed. It earns no coins and saves no records.
- **Daily Run**: the same seeded track for everyone today, Chill rules, no items, unlimited tries, its own daily table.
- **Challenge**: a friend-vs-friend duel on a shared seeded track in the sender's mode (Chill or Extreme), 3 tries each, best try counts.

**Progression**
- Coins come from distance (1 per metre, ×2 in Extreme, reduced after 25 a day), big coins every 5 m, one-time distance chests, daily login, 3 daily quests, a login-streak chest cycle and invites.
- Spend coins in Upgrades:
  - **CORE** permanent stats: arc radius, speed, Score Boost, timer length, combo window, combo cap, wall tolerance, magnet range;
  - up to 4 **ability slots** (Time Slow, Phase Burst, Brake, Coin Pull, Shockwave, Anchor), triggered in a run with a cooldown;
  - one-run **items** (Revive, Doubler, Shield, Bounce …);
  - cosmetics (trail colours, themes, avatars).
- Badges, a profile, friends (`NAME#TAG`), ghost trails of past runs and a PB ghost replay round it out.
- First launch runs an interactive tutorial (tap to turn, steer into green, the number is your energy, avoid red and walls).

## Project layout

- The whole game is one file: `arcrise.html` (~15.8k lines; inline `<script>`s, no build step). Everything referenced below lives in it unless stated.
- `firestore.rules` and `firestore.indexes.json` (new, two composite indexes on `scores`: `mode` + `score` ascending and descending) are the server side.
- `www/` and `android/app/src/main/assets/public/` are **copies**, produced by `npm run sync`. They are gitignored. Review `arcrise.html` only.
- All persistent state is in `localStorage` under `arc_*` keys. Upgrade state is the JSON object `arc_upg_v1` (`upg` in code).
- `ARC_DB` (≈ lines 5100–6130) wraps Firebase REST. Its public surface is the `api` object at ≈ line 6123.
- Line numbers below are hints for this commit; search by name if they have moved.

## What changed, by area

Each area ends with **Verify** items. These are the places most likely to hide bugs.

### 1. Coin economy

Coins now come only from distance, plus a few fixed sources. Gold balls and crystals give score only (`COIN_PER_GOLD = 0`).

| Constant (≈ line 7314) | Value |
|---|---|
| `COIN_PER_M` | 1 coin per metre |
| `COIN_EXTREME_MUL` | 2 (Extreme doubles metre coins) |
| `COIN_DAY_SOFT` / `COIN_SOFT_RATE` | 25 / 0.4 (after 25 coins today, run income ×0.4) |
| `BIG_COIN_EVERY_CM` / `BIG_COIN_VALUE` (≈ line 10362) | 500 / 2. A "big coin" sits in a narrow gap between two obstacles at every 5 m mark. |
| `distChestValue(cm)` (≈ line 10369) | Distance chests at 2.5 m (25 coins), 5 m (50), then +25 per 5 m (10 m = 75, 15 m = 100 …). Each chest appears **once per lifetime** (`arc_dist_chests`). Once a chest at a 5 m mark is opened, that mark spawns a big coin instead. |

Run-end flow in `_proceedEndGame` (≈ line 10440):

```
deltaCm, deltaGold, deltaBig, deltaChest   // only what is new since the last credit (ad-continue)
raw     = (runCoinsRaw(deltaCm, deltaGold) + deltaBig * BIG_COIN_VALUE) * doublerMul
capped  = applySoftCap(raw)                 // float
total   = capped + deltaChest + coinCarry   // chests skip the soft cap and the Doubler
gained  = floor(total)
coinCarry = total - gained                  // persisted to arc_coin_carry
addCoinsEarnedToday(gained - deltaChest)    // chests must not fill the daily ledger
```

A chest picked up mid-run is stored in `arc_chest_pending` and granted on the next launch if the app is killed before the run ends (≈ line 14969). The run-end path removes that key.

Fixed sources: login `LOGIN_COIN = 1`, quests `QUEST_COIN = 2` ×3 + `QUEST_ALL_COIN = 1`, first game +3, `REFERRAL_COIN = 10`. Login-streak chests (every 5th/15th/60th/120th day: 10 / 25 / 60 / 100 coins plus items or cosmetics) are in the streak reward code.

The Doubler consumable costs 6 and now doubles coins for the next 5 runs.

**Verify:**
- `gained` is an integer ≥ 0 and `0 ≤ coinCarry < 1` after every run, including runs with a chest.
- A chest is never credited twice: not by the pending key plus the run end, not by ad-continue (`_runChestBanked`), and not by a second chest spawn at the same mark.
- `arc_coin_day_amt` grows only by non-chest income. `gained - deltaChest` cannot go negative.
- Chests and big coins are disabled in seeded runs (daily run and challenge, see §3) and in Wife mode. Distance coins in seeded runs still go through the soft cap. Wife mode earns nothing.
- `nextCoinLeft()` (≈ line 13780) gives the same "NEXT COIN · X TO GO" in the Coins window and on game over, including Extreme ×2 and the soft cap.
- Game-over coin animation (`_coinAnimFrom` / `_coinAnimTo`, ≈ line 10594) ends on the real carry, and the token that cancels pending steps works when AGAIN is pressed mid-animation.

### 2. Score system (v26 → v27)

- One gain path: `gainScore(raw)` (≈ line 7256) = `round(raw × SCORE_SCALE × comboMul())`, then booster and time multipliers. `SCORE_SCALE = 1`, `DIST_PTS_PER_M = 5`.
- Combo is a real multiplier: `comboMul()` starts at 3 consecutive greens (`COMBO_START = 3` → ×2, 4 → ×3 …) up to `comboCap()` = 3 + `upg.comboMax` (max ×7). The old "pot" (bank points at the cap) is gone, but `_comboPot` is still declared.
- Time multiplier is stepped: `timeMulFor(cd)` → 0–3 ×1, 4–6 ×2, 7–9 ×3, 10–12 ×4.
- `getScoreMul()` returns 1.5 in every mode.
- Start line at 10 cm (`distOriginY`): distance and score count from the line. A run that never crosses it does not count as a game, streak or quest progress.
- One-time migration `arc_score_v26` multiplied old local scores by 0.2.
- New scoring objects: THREAD (pass between a spinning pair), gate, ×2 ring, crystal, gold corridor, TIMING obstacle. Base points are listed in the v27 devlog entry.

**Verify:** every score source goes through `gainScore` (search for direct `score +=`). Multipliers stack as documented and nothing applies the combo twice. A run killed before the start line leaves stats, quests and streak untouched.

### 3. Seeded runs: Daily Run and challenges

- `_seeded()` (≈ line 6931) is true in the Daily Run and in an active challenge. Then `srand()` uses `mulberry32(dailySeed(...))` (≈ line 9373), difficulty uses each slot's own height, and the first slot starts from `H_REF` instead of `H`. The track must be identical on every screen size and upgrade level.
- Seeded runs: no items (including Revive), no chests, no big coins. The Daily Run is always Chill; a challenge uses the sender's mode. The player's own mode is saved and restored.
- Daily scores go to `daily/{YYYYMMDD}/scores/{uid}` (`submitDaily`), never to the normal leaderboard. `_proceedEndGame` captures `wasDaily` at the top to avoid a race with the next run.

**Verify:** no `Math.random()` left in spawn code that runs during a seeded run (it would desync the track). Items cannot be consumed in a seeded run, including through the tutorial-to-run transition. The player's real mode is restored on every exit path (game over → menu, quit mid-run, app reload).

### 4. Friends and challenges

- Invite links carry `?ref=CODE&from=NAME#TAG`. A new player who arrives through one sends a friend request with `via: CODE` (`sendPendingReferralFriend`, ≈ line 15352). The inviter's client auto-accepts pending requests whose `via` equals its own code.
- Friend edges: mutual requests collapse into one record, removal deletes both directions, a reverse request is resolved as an accept (commit `b795fce`).
- Challenge flow: ⚔ starts a seeded run (`seed = ts`) with **3 tries**; the best try is sent as the target (`sendChallenge`, doc id `from__to__ts`). The receiver plays the same track with 3 tries; progress is kept in `arc_chal_prog` so closing the app does not reset tries. After the third try both bests are compared (a tie goes to the sender) and the receiver writes `status` + `result` once (`resolveChallenge`). A run that does not cross the start line does not use a try. Code: `finishChallenge` and around, ≈ line 15500.
- Rules (`firestore.rules`): `challenges` require `areFriends(from, to)` via `friendreqs` with status `accepted`, a fixed key list, and allow the receiver exactly one update to `won`/`lost`.

**Verify:**
- Can a player gain an extra try (reload mid-run, kill the app on the game-over screen, open the challenge on two devices)?
- Can the receiver resolve without playing, or resolve with a result that is not their real best? (Results are client-reported; say whether the rules make anything worse than that.)
- Rules: can a non-friend create a challenge, can anyone but the receiver update, can `via` be abused to force a friendship on someone who never opened the link?
- The offline cache of the friends list is kept when `getMySocial` fails (it now returns `null`, not `[]`).

### 5. Leaderboard ranking

- New queries: `getScoresAbove` / `getScoresBelow` / `countAbove` (≈ line 5548). They need the composite indexes in `firestore.indexes.json`. **We have not confirmed these indexes are deployed.** Say what the client does if the index is missing (error path, empty list, wrong rank).
- The in-game name list on the right edge was removed (players could not focus on the run). Nothing in the game loop should still query or render it.
- High Scores: outside the top 30 it shows `#1 · ··· · above you · YOU (real rank) · below you`. Game over: outside the top 20 it shows the real rank and the player just above.
- `dedupeBest` (≈ line 5444) dedupes by owner + `NAME#TAG` + mode, so two profiles on one uid stay separate rows.

**Verify:** rank numbers are off-by-one free with ties (`GREATER_THAN` above, `LESS_THAN_OR_EQUAL` below). The player is not shown twice or missing at window edges. Failures fall back to the old top-N view instead of a blank panel.

### 6. Gameplay objects, items and abilities

- `bounceOffWall()` / `bounceOffObstacle()` (≈ line 9329): real reflection. Used by Ghost, Shield, the tutorial wall and the new **Bounce** item (first 3 crashes bounce, price 11, max 3 in stock). This fixed a Ghost-on-wall sticking bug.
- Brushing past a crystal (CLOSE) grants a random booster.
- Coin Pull and Shockwave now have a 4-level radius ladder (`abilityRadius`, which reads `durLvl`). Coin Pull only pulls balls inside its radius.
- Slot upgrades: `upg.slotUpg[i] = { dur, cd }`, 3 levels each, prices `SLOT_UPG_PRICES = [12, 70, 350]`. `slotUpgOf()` clamps on every read.
- `ABILITY_UNLOCK_PRICES` is now 6 entries: 30, 60, 120, 240, 480, 970.
- PB ghost: the best run is recorded every 0.1 s (max 4000 points) to `arc_pb_ghost_normal` / `_extreme` and replayed. It can be turned off in Settings.

**Verify:** a Bounce plus Shield plus Ghost combination never double-spends a charge or lets the ball tunnel through an obstacle. `upg` fields added since v25 (`slotUpg`, `themesTried`, `pbGhost`, ability `durLvl` for the radius abilities) cannot be tampered into gameplay values beyond their ladders. The v25 clamps (`clampCoreLevels` ≈ line 12733, `clampAbilityLadders` ≈ line 13410) still run before any gameplay read.

### 7. Retention and UI systems

These are lower priority; review if time allows.

- Login streak: a 120-day repeating cycle with chests; missing one day does not break the streak, missing two resets it; day difference uses calendar days (`localDayNum`) to survive DST.
- Quests: "play N runs" was replaced with near-misses (a run that dies at once advanced quests before). Combo quest target is capped at `comboCap()`.
- Theme trial ("TRY 1 RUN", `sessionStorage.arc_theme_trial`, `effectiveTheme()`): the real theme must come back on every exit path.
- Settings: Graphics `Auto/High/Low` (`arc_gfx`, ≈ line 6217) and PB Ghost on/off.
- Many CSS and animation changes (headers, close buttons, notifications, game-over layout). Skip pure visuals unless something breaks layout on a 320 px wide screen.

### 8. Unchanged from v25 (regression check only)

The "−" button refund model (`coreOwned`, `durOwn`), the level clamps, the price ladders and `ARC_RESET_VERSION = 'r-2026-09-28-2'` are unchanged. Confirm nothing since v25 broke them.

## How to test

There is now an end-to-end suite with an **in-memory fake Firebase** (Auth + Firestore with rule checks). It never contacts real Firebase.

```bash
E2E_PART=1/2 npm test     # the full suite takes over 10 minutes; run it in two halves
E2E_PART=2/2 npm test
npm test -- pb,meydan     # run only tests whose name matches (names are Turkish: meydan = challenge, sandığı = chest, sıralama = ranking)
```

35 tests, headless Chrome through CDP (macOS Chrome path is hard-coded). With `?debug=1` the game exposes `window.ARC_TEST` (scene, mode, coin state `coinAnim`, `feats`, `pbGhost`, spawn helpers such as `spawnFeatHere`). Use it in DevTools too.

The economy bot still works:

```bash
python3 -m http.server 8765 --bind 127.0.0.1        # from repo root
node tools/bot-econ.mjs 1 2 '{"comboSplitV22":true}' normal
```

Headless notes: App Check logs `appCheck/recaptcha-error` on `127.0.0.1`; that is expected. Fixed-position modals have a null `offsetParent`; use `getBoundingClientRect()` for visibility. Google Fonts do not load headless, so text metrics differ slightly from a phone.

## Known open issues (do not fix, but you may comment)

- Scores, coins and challenge results are client-side. App Check is not enforced yet. Rules only range-check values.
- With full upgrades, score per metre is still high (time ×4 × combo ×7 × Profit × boosters). Pending design decision.
- New players mostly die at 1–3 m, before the first big coin (5 m).
- Open questions for the designer: the challenge tie rule (sender wins), whether the "player below you" row should return on game over.
- From v25, still open: Walls (`wallSoft`) is very weak, and Combo Timer gives more survival per coin than Timer.

## What to report

For each finding give the location (function name and approximate line), a concrete reproduction (a `localStorage` seed plus actions, an `ARC_TEST` call, or an input value), the observed versus expected result, and a severity. Separate **confirmed** bugs, which you reproduced, from **suspicions**, which you only read in the code. Put Firestore rules findings in their own section.
