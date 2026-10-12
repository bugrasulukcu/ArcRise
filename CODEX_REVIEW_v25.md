# Cross-check brief: ArcRise, everything since v25

You are reviewing ArcRise, a mobile arcade game, at commit `1fbcb9a`. The previous review covered v25 (`61b5f7d`, the ×1 economy). About 70 commits have landed since then. Find bugs in them and report back. **Do not refactor, rebalance or "improve" numbers.** The numbers are deliberate design decisions. Report anything that looks wrong; do not change it.

`git diff 61b5f7d 1fbcb9a -- arcrise.html firestore.rules` is the review scope (~5,300 lines changed in `arcrise.html`). `DEVELOPMENT_LOG.md` (Turkish) has one entry per change, newest first, if you need the intent behind a change.

## Safety rules (read first)

- **Never let the game talk to production Firebase** (project `arcrise-e1504`). App Check is in monitor mode, so any score, wallet, friend or challenge write from a local browser reaches live players. When you run the game in a browser, block these hosts: `firestore.googleapis.com`, `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, `firebaseappcheck.googleapis.com`, `firebaseinstallations.googleapis.com`. `tools/bot-econ.mjs` and `tests/e2e.mjs` already do this.
- **Do not run `tools/seed-players.mjs`.** It writes fake players and scores to the live database by design.
- Do not run `firebase` CLI commands (no rules or index deploys), `git push`, or anything that deletes data.
- Do not start the autopilot (`?bot=1`, `ARC_BOT.start()`) without the network block above.

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
- Chests, big coins and the soft cap are all disabled in seeded runs (daily run and challenge, see §3). Wife mode earns nothing.
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
- Seeded runs: Normal mode only (the player's mode is saved and restored), no items, no chests, no big coins.
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

- `index.html` cache-bust is still `?v=20261001e`, but the last three commits changed `arcrise.html`. Say whether returning players would keep a stale build.
- Scores, coins and challenge results are client-side. App Check is not enforced yet. Rules only range-check values.
- With full upgrades, score per metre is still high (time ×4 × combo ×7 × Profit × boosters). Pending design decision.
- New players mostly die at 1–3 m, before the first big coin (5 m).
- Open questions for the designer: the challenge tie rule (sender wins), whether the "player below you" row should return on game over.
- From v25, still open: Walls (`wallSoft`) is very weak, and Combo Timer gives more survival per coin than Timer.

## What to report

For each finding give the location (function name and approximate line), a concrete reproduction (a `localStorage` seed plus actions, an `ARC_TEST` call, or an input value), the observed versus expected result, and a severity. Separate **confirmed** bugs, which you reproduced, from **suspicions**, which you only read in the code. Put Firestore rules findings in their own section.
