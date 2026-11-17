// Dip-recovery bot for the cbBTC 1-minute race.
//
// Idea: on 1-minute bars the price is noisy (typical bar moves ~6 bps) while a
// full round trip costs ~35 bps in fees, slippage and pool impact, so chasing
// every wiggle loses money. This bot does the opposite: it waits for a real
// dip, buys it, and sells the recovery.
//
//   - Reference: the simple moving average of the last 30 closes (SMA30).
//   - Entry, on a bar's close (filled at the next open): the close sits at
//     least 60 bps below SMA30, and the bot holds nothing.
//   - Exit, the whole position, on a bar's close: the close has recovered to
//     at least 60 bps above SMA30, or the position is worth 100 bps over its
//     cost (take profit), or 150 bps under it (stop loss). The stop is wider
//     than the target on purpose: a dip regularly overshoots 100 bps before
//     it recovers, and the stop is there to cap a real breakdown, not to
//     exit ordinary noise.
//   - Stake: the whole equity on each entry (one open position at most, the
//     cap the harness sets). No partial positions, no re-entry while holding.
//   - Each order caps its slippage at 100 bps past the close it was decided
//     on, so a sell into a liquidity gap is refused rather than filled for
//     almost nothing; a refused order is simply sent again on the next bar
//     while its reason still holds.
//
// The indicators read every batch, the warm-up's included; while warming up
// the bot sends no order. Everything is deterministic: plain float64
// arithmetic on the closes, no randomness, no wall clock, no network, so two
// runs on the same bars produce the same orders.

import { BPS, runBars, type Bar, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SMA_BARS = 30;
/** Entry/exit band: 60 bps away from SMA30. */
const BAND_BPS = 60;
/** Take profit: position worth 101/100 of its cost. */
const TAKE_PROFIT = [101n, 100n] as const;
/** Stop loss: position worth 197/200 of its cost. */
const STOP_LOSS = [197n, 200n] as const;
const MAX_SLIPPAGE_BPS = 100;

/** The closes seen so far, oldest first; only the last SMA_BARS are kept. */
const closes: number[] = [];

function push(bar: Bar): void {
  closes.push(Number(bar.c));
  if (closes.length > SMA_BARS) closes.shift();
}

/** The mean of the last SMA_BARS closes, or null before SMA_BARS bars. */
function sma(): number | null {
  if (closes.length < SMA_BARS) return null;
  return closes.reduce((a, x) => a + x, 0) / SMA_BARS;
}

/** Whether a held position exits on this close: recovered above the band, or at the take profit or the stop loss. */
function exits(state: BarsState, symbol: string, held: { qty: bigint; cost: bigint }, mean: number | null): boolean {
  const value = state.value(symbol, held.qty);
  if (value * TAKE_PROFIT[1] >= held.cost * TAKE_PROFIT[0]) return true;
  if (value * STOP_LOSS[1] <= held.cost * STOP_LOSS[0]) return true;
  if (mean !== null) {
    const close = closes[closes.length - 1];
    if ((close - mean) / mean >= BAND_BPS / 10000) return true;
  }
  return false;
}

await runBars({
  onBatch(state, batch) {
    for (const bar of batch.bars) push(bar);
    if (state.warmingUp) return [];
    const mean = sma();
    if (mean === null) return [];
    const { caps, fees } = state.hello;
    const fresh = new Set(batch.bars.map((b) => b.symbol));
    const sells: SellInput[] = [];
    const entries: string[] = [];
    for (const { symbol } of state.hello.symbols) {
      if (!fresh.has(symbol)) continue;
      const held = state.positions.get(symbol);
      if (held !== undefined) {
        if (exits(state, symbol, held, mean)) {
          sells.push({ side: 'sell', symbol, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS });
        }
        continue;
      }
      const close = closes[closes.length - 1];
      if ((close - mean) / mean <= -BAND_BPS / 10000) entries.push(symbol);
    }

    const orders: (SellInput | BuyInput)[] = sells.slice(0, caps.max_orders_per_bar);
    const slots = Math.min(state.hello.symbols.length, caps.max_open_positions);
    const stake = state.equity / BigInt(slots);
    const byWeight = (BigInt(caps.max_weight_bps) * state.equity) / BPS;
    let room = slots - state.positions.size;
    let cash = state.cash;
    for (const symbol of entries) {
      if (room <= 0 || orders.length >= caps.max_orders_per_bar) break;
      let slice = stake < byWeight ? stake : byWeight;
      if (cash < slice) slice = cash;
      if (slice === 0n || slice < BigInt(fees.min_notional_quote_units)) break;
      orders.push({ side: 'buy', symbol, notional_quote_units: slice, max_slippage_bps: MAX_SLIPPAGE_BPS });
      cash -= slice;
      room--;
    }
    return orders;
  },
});
