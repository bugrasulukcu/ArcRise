# Cross-check brief: ArcRise v25 economy change

You are reviewing one change to ArcRise, a mobile arcade game. Verify that the change does what is described below, find bugs, and report back. **Do not refactor, rebalance or "improve" numbers.** The numbers are deliberate design decisions. Report anything that looks wrong; do not change it.

## Safety rules (read first)

- **Never let the game talk to production Firebase** (project `arcrise-e1504`). App Check is in monitor mode, so any score or wallet write from a local browser reaches the live leaderboard. When you run the game in a browser, block these hosts: `firestore.googleapis.com`, `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, `firebaseappcheck.googleapis.com`, `firebaseinstallations.googleapis.com`. `tools/bot-econ.mjs` already does this through CDP `Network.setBlockedURLs`.
- Do not run `firebase` CLI commands, `git push`, or anything that deletes data.
- Do not start the autopilot (`?bot=1`, `ARC_BOT.start()`) without the network block above.

## Project layout

- The whole game is one file: `arcrise.html` (~12k lines; inline `<script>`s, no build step, no test suite). Everything referenced below lives in it.
- `www/` and `android/app/src/main/assets/public/` are **copies**, produced by `npm run sync` and checked by `npm run verify`. They are gitignored. Review `arcrise.html` only.
- All persistent state is in `localStorage` under `arc_*` keys. Upgrade state is the JSON object `arc_upg_v1` (`upg` in code).
- Line numbers below are hints for this commit; search by name if they have moved.

## What changed

### 1. Coin income is now 1 coin per metre, with fractional carry-over

Before: 2 coins per metre, rounded down per run, daily soft cap of 150.
Now:

| Constant (≈ line 5950) | Value | Meaning |
|---|---|---|
| `COIN_PER_M` | 1 | coins per metre travelled |
| `COIN_EXTREME_MUL` | 2 | metre coins are doubled in Extreme mode (gold balls are **not** doubled) |
| `COIN_PER_GOLD` | 1 | coins per gold ball |
| `COIN_DAY_SOFT` | 25 | after 25 coins earned today, further run income is multiplied by `COIN_SOFT_RATE` |
| `COIN_SOFT_RATE` | 0.4 | |
| `COIN_CARRY_KEY` | `'arc_coin_carry'` | fractional coin carried to the next run (0 ≤ carry < 1) |

Run-end flow (in `endGame`, look for `const capped   = applySoftCap`, ≈ line 8252):

```
raw     = runCoinsRaw(deltaCm, deltaGold) * doublerMul   // float
capped  = applySoftCap(raw)                               // float; soft cap applied fractionally
total   = capped + coinCarry
gained  = floor(total)                                    // integer coins credited
coinCarry = total - gained                                // persisted to arc_coin_carry
```

Wife mode earns nothing (existing guard `gameMode !== 'wife'`).

The game-over breakdown text (search `next coin`) now shows the fractional metre coins, `(extreme ×2)`, the daily-cap loss, and `next coin N%`. After the count-up animation, the coin bar shows the carry fraction.

**Verify:**
- `gained` is always an integer ≥ 0 and `0 ≤ coinCarry < 1` after every run.
- Coins are neither lost nor duplicated across runs. Summed over runs, `coinsEarned` from runs = `floor(Σ capped + initial carry)`.
- The ad-continue path (`_runCmBanked` / `_runGoldBanked`) still credits only the new distance on the second death, and the carry is applied once per credit.
- `applySoftCap` is correct with fractional input, both below and across the 25 threshold. It reads `coinsEarnedToday()`, an integer ledger that `addCoinsEarnedToday(gained)` updates.
- Extreme doubles metres only; `runCoinsRaw` uses `coinModeMul()`.
- A corrupted `arc_coin_carry` (NaN, negative, ≥ 1, a string) is clamped on load.

### 2. Rewards (≈ line 11966 and the first-game block)

`LOGIN_COIN = 1`, `QUEST_COIN = 2` (3 quests per day), `QUEST_ALL_COIN = 1`, so the daily maximum is 8. First game bonus is 3 (`grantCoins(3)`), `REFERRAL_COIN = 10`. The static HTML text "Earn 10 coins every time a friend opens your invite link" must match `REFERRAL_COIN`.

### 3. Extreme mode

- `getScoreMul()` returns 1.5 in every mode. The ×3 score multiplier for Extreme is removed.
- The Extreme popup row reads "Coins ×2". `store_listing.md` says "2x coins".
- `EX_DIRECT_PRICE = 45` and `EX_DISCOUNT_PRICE = 6`. The static labels "Pay 45 coins" and "DISCOUNT · 6 coins if both are met" must match the constants.

### 4. Prices: target is about 3 years for a 12-runs-per-day player (~36,100 coins)

| Array / constant | Values |
|---|---|
| `PROFIT_PRICES` | 3, 6, 14, 30, 60, 130, 280, 600, 1250, 2700 |
| `DIR_PRICES` (radius and speed, each direction) | 3, 16, 85, 440 |
| `TIMER_PRICES` | 15, 95, 580, 3550 |
| `COMBOWIN_PRICES` | 8, 60, 490, 3800 |
| `COMBOMAX_PRICES` | 7, 55, 460, 3700 (**4 levels**, see §5) |
| `WALLSOFT_PRICES` | 4, 16, 60, 240, 940 |
| `MAGRANGE_PRICES` | 3, 8, 19, 45, 120, 300, 740, 1850 |
| `ABILITY_CFG[*].durPrices` (timeslow, phaseburst, brake) | 7, 40, 230, 1350 |
| `ABILITY_UNLOCK_PRICES` | 30, 60, 120, 240, 480, 970, 1950 |
| `SLOT_PRICES` | 6, 45, 340, 2550 |

Cosmetics, consumables and IAP packs were divided by about 9 (for example `CONSUMABLE_CFG.revive.price = 7`, `doubler = 2`; IAP `data-amount` values are 55, 200, 450, 1100).

**Ability unlock price now depends on how many abilities are already owned, not on which ability it is.** See `abilityUnlockPrice()` (≈ line 10680). The field `ABILITY_CFG[k].unlock` was removed. **Verify that nothing still reads `cfg.unlock`.** `buildAbilityCard` (live code) and `abilityCard` (dead code, only reachable via the unused `buildDetailBody`) must both use `abilityUnlockPrice()`.

### 5. Upgrade effect changes

- **Max Combo cap is now ×3 → ×7** (4 levels, formerly ×12 over 9 levels). `comboCap() = COMBO_CAP_BASE (3) + upg.comboMax`. A chain banks `5·n·(n+1)` points, so ×7 pays 280.
- COMBO badge tiers are `[3, 4, 5, 6, 7]`.
- **Combo quest target is capped at the player's current `comboCap()`** in `rollDailyQuests` (`Math.min(scaleTarget(def, s), comboCap())`). Before this, the target started at 5 while the base cap was 3, which made the quest impossible.
- **Magnet**: pickup radius grows by `MAG_PX_PER_LVL = H_REF / CM_PER_SCREEN / 10` (≈ 7.1 px, i.e. 1 mm in the game's distance metric where 1066 px = 15 cm) per level, instead of 22 px. The UI shows "+N mm". `magGrab` also enlarges the gold-ball hit radius.

### 6. Bug fix: the "−" button no longer burns coins

Before: for one-directional CORE upgrades (`profit`, `timer`, `comboWin`, `comboMax`, `wallSoft`, `magnetRange`) and for ability duration, pressing − lowered the level and dropped the purchase. Pressing + afterwards charged again for a level the player had already paid for.

Now:
- `upg.coreOwned[key]` holds the highest purchased level of each one-directional CORE upgrade. `coreBtnInfo` makes + free while `level < coreOwned`, and `coreBuyInc` raises `coreOwned`. This mirrors the existing `radiusPos` / `radiusNeg` model for the two-directional upgrades.
- `upg.inv[k].durOwn` does the same for ability duration (`buildAbilityCard` wires `plus-free`).

**Verify:** buy → − → + must leave the coin balance unchanged, and buying past the owned level must charge exactly one price. The undo snapshot in `spendCoins` / `lastPurchase` clones `upg`, so undo must restore `coreOwned` / `durOwn` correctly too.

### 7. Level clamping on load (security)

`clampCoreLevels()` (≈ line 10190, runs once at startup after the price arrays exist) clamps every CORE level to `[0, coreSideMax]` and bidi `Active` to `[-Neg, Pos]`. It also back-fills `coreOwned` from old saves (`coreOwned = max(level, coreOwned)`). `clampAbilityLadders()` does the same for `durLvl` and `durOwn`.

Before this, a tampered `arc_upg_v1` such as `{"comboMax":100000}` removed the combo cap and let scores explode. **Verify** there is no remaining path where an unclamped level reaches gameplay: `comboCap`, `getRadius`, `getBaseSpeed`, `comboDisplayMax`, `comboWindowSec`, `magGrab`, `wallTol`, `profitMul`. In particular, check that nothing reads `upg` for gameplay **before** the clamp IIFEs have run.

### 8. One-shot data reset

`ARC_RESET_VERSION = 'r-2026-09-28-2'` (≈ line 5194). On the first load of this version, every device wipes its `arc_*` keys, including `arc_fb_rt`, so it gets a new anonymous uid and never restores an old cloud wallet. `index.html` cache-bust is `?v=20260928b`. Production Firestore was already wiped separately.

## How to test

There is no test suite. Use a real browser with Firebase blocked.

```bash
python3 -m http.server 8765 --bind 127.0.0.1        # from repo root
node tools/bot-econ.mjs 1 2 '{"comboSplitV22":true}' normal
node tools/bot-econ.mjs 1 2 '{"comboSplitV22":true}' extreme
```

`tools/bot-econ.mjs` launches headless Chrome through CDP (macOS Chrome path is hard-coded), seeds `localStorage`, blocks Firebase, runs the autopilot and prints per-run distance, golds, raw coins and the final `arc_coins_earned` / `arc_coin_carry`.

Expected results for a fresh save:
- `earned` = run coins + 3 (first game) + 1 (login).
- `carry` is in [0, 1).
- Normal: about 2 m and about 2 coins per run. Extreme: metre coins doubled.

Useful manual checks from DevTools (with the network block in place):

1. Seed `arc_upg_v1 = {"comboSplitV22":true,"profit":3,"comboMax":100000,"magnetRange":-5,"speedPos":2,"speedActive":50}` and reload with a fresh navigation (a CDP `Page.reload` can stall on a beforeunload). Expect `comboMax` 4, `magnetRange` 0, `speedActive` 2 and `coreOwned.profit` 3.
2. In Upgrades → Score Boost: − then + is free; the next + costs the next ladder price; − ×4 then + ×4 costs nothing.
3. Unlock two abilities: the prices must be 30, then 60, whichever ability you pick first.

Headless notes: App Check logs `appCheck/recaptcha-error` on `127.0.0.1`. That is expected and harmless. The purchase confirm modal is `#buy-modal` / `#buy-confirm-btn`. It is `position: fixed`, so `offsetParent` is always null; use `getBoundingClientRect()` to check visibility.

## Known open issues (do not fix, but you may comment)

- Walls (`wallSoft`) is very weak: at most 5 px against an 18 px player radius.
- Combo Timer gives more survival per coin than Timer (energy seconds = `comboDisplayMax() × comboWindowSec() / 2`).
- Extreme's discount unlock still requires 5,000 score, which is much harder now that the ×3 multiplier is gone.
- The income numbers come from the bot, which plays better than a typical human. They will be recalibrated from live data.
- `DENOM_V23` (×12 migration) is still in the code. It is a no-op for fresh saves because 0 × 12 = 0.

## What to report

For each finding give the location (function name and approximate line), a concrete reproduction (a `localStorage` seed plus actions, or an input value), the observed versus expected result, and a severity. Separate confirmed bugs, which you reproduced, from suspicions, which you only read in the code.
