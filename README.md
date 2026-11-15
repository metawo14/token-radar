# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/metawo14/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/metawo14/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar — rank pre-token protocols by implied value. It reads the sealed DefiLlama snapshot, ranks every pre-token protocol by an implied value, and hands the reader a farm plan for each one. Entered on [make.fun](https://make.fun/bounty/token-radar-01).

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

## The model (radar-2)

```
implied = round( tvl_usd
                   x category_multiple
                   x (1 + clamp(change_7d, -50, 150) / 100 x 0.6)
                   x (0.55 + min(age_days, 1460) / 1460 x 0.45)
                   x (1 + 0.03 x min(chains - 1, 4)) )
```

- **Category multiple** (0.16–0.42): fee-earning venues (perpetuals, DEXes,
  launchpads) score higher than custody-like wrappers. It is a property of
  the snapshot's category field, never of a protocol name.
- **Growth**: seven-day TVL change, clamped so one wild week cannot decide
  the board.
- **Maturity**: how long the protocol has been listed with no token on
  record; unknown age counts as 365 days.
- **Chain breadth**: live on more chains reaches more users, capped at 5.

The board covers the snapshot's whole 40-protocol watchlist, plus the 200
rankable pre-token protocols below the $50M floor with the most TVL — 240
rows in all. Live-token protocols are set aside with their market caps, never
mixed into the ranking. The board says a protocol "records no token", never
that it has none: the snapshot's record is not proof.

## Run it locally

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

Node 22 or later, standard library only, no install. The program writes
`out/board.json`, `out/data.js`, `out/dashboard/`, `out/screenshots/` and
`out/dossier.json`. Open `out/dashboard/index.html` in a browser (no network
needed) to use the radar: sortable board, search, category / chain / TVL
filters, a detail view per protocol with its model breakdown and farm plan,
and a live-token view.

## Layout

- `main.ts` — entrypoint: reads the snapshot, writes the outputs.
- `lib/model.ts` — the value model, the farm plans, the board builder.
- `dashboard/` — the static page (index.html, app.css, app.js).
- `screenshots/` — board, detail and filtered views of the dashboard.
- `vendor/makefun-board.ts` — make.fun's dossier library (vendored, as shipped).

---

<sub>Entered on [make.fun](https://make.fun/?ref=h5zysa6c&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>

---
