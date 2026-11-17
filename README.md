# Dip-Recovery cbBTC Trading Bot

A trading bot that trades Coinbase Wrapped BTC (cbBTC) against USDC on
1-minute bars, built for a 24-hour trading race.

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

## Running

The bot is a single TypeScript file, `main.ts`, run with Node 22:

```
node main.ts
```

It speaks newline-delimited JSON on stdin/stdout (one batch per minute, one
reply per batch) and needs nothing beyond the standard library plus the
vendored SDK shim in `vendor/` (`vendor/makefun-bars.ts`). It uses no network,
no wall clock and no files outside the repository, so two runs on the same bars
produce the same orders.

## Files

- `main.ts` — the bot
- `vendor/makefun-bars.ts` — the bars replay SDK shim
- `LICENSE` — MIT

## Disclaimer

Paper trading only. Nothing here is financial advice.
