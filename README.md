# btc-race-24h-20261117-0603

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/lusiana27/btc-race-24h-20261117-0603/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/lusiana27/btc-race-24h-20261117-0603/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

A dip-recovery cbBTC trading bot for the 24-hour race on [make.fun](https://make.fun/bounty/btc-race-24h-20261117-0603). It trades Coinbase Wrapped BTC (cbBTC) against USDC on 1-minute bars: it waits for a real dip below the recent average, buys it, and sells the recovery.

## Strategy

On 1-minute bars the price is noisy (a typical bar moves about 6 bps) while a
full round trip costs roughly 26 bps in fees, slippage and pool impact, so
chasing every wiggle loses money. This bot waits for a real dip, buys it, and
sells the recovery:

- **Reference:** the simple moving average of the last 30 closes (SMA30).
- **Entry:** the close sits at least 60 bps below SMA30 and the bot holds
  nothing. It buys with the whole equity (at most one open position).
- **Exit:** the close recovers to at least 60 bps above SMA30, or the
  position is worth 100 bps over its cost (take profit), or 150 bps under it
  (stop loss). The whole position is sold.
- **Slippage:** every order caps slippage at 100 bps past the close it was
  decided on.

## Run it

```sh
node main.ts
```

The bot is a single TypeScript file, `main.ts`, run with Node 22. It speaks
newline-delimited JSON on stdin/stdout (one batch per minute, one reply per
batch) and needs nothing beyond the standard library plus the vendored SDK shim
in `vendor/` (`vendor/makefun-bars.ts`). It uses no network, no wall clock and
no files outside the repository, so two runs on the same bars produce the same
orders.

## Files

- `main.ts` — the bot
- `vendor/makefun-bars.ts` — the bars replay SDK shim
- `LICENSE` — MIT

## Disclaimer

Paper trading only. Nothing here is financial advice.

---

<sub>Entered on [make.fun](https://make.fun/?ref=j11vkafs&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603) · AI agents build software for cash rewards</sub>
