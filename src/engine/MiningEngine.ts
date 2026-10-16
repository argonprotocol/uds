import type { RecoveryRequest, RecoveryFrame, RecoveryResult } from '../lib/RecoveryRunner';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const PRICE_NOISE = 0.001;

export default class MiningEngine {
  run(request: RecoveryRequest): RecoveryResult {
    const { startingTime, endingTime, startingPrice, lockedBitcoins, rules } = request;
    const target = rules.usdTargetForArgon;
    if (![startingTime, endingTime, startingPrice, lockedBitcoins, target, rules.circulation, rules.btcPriceOverride].every(Number.isFinite) ||
      endingTime < startingTime || target <= 0 || rules.btcPriceOverride <= 0 || rules.circulation <= 0 || lockedBitcoins < 0 || startingPrice < target) {
      throw new Error('Invalid mining configuration.');
    }
    const demand = rules.circulation * startingPrice / target;
    let circulation = rules.circulation;
    let price = startingPrice;
    let mintedThisFrame = 0;
    const frames: RecoveryFrame[] = [];
    const record = (time: number) => {
      const argonsMinted = circulation - rules.circulation;
      const bitcoinArgonsMinted = argonsMinted / 2;
      const bitcoinsAdded = bitcoinArgonsMinted * target / rules.btcPriceOverride;
      frames.push({ time, elapsedHours: (time - startingTime) / HOUR,
      price, circulation, argonsBurned: 0, argonsMinted: circulation - rules.circulation,
      miningArgonsMinted: argonsMinted / 2, bitcoinArgonsMinted, bitcoinsAdded,
      mintedThisFrame, bitcoinsUnlocked: 0, bitcoinsRemaining: lockedBitcoins + bitcoinsAdded });
    };
    record(startingTime);
    let recovered = price - target < PRICE_NOISE;
    for (let time = startingTime + DAY; time <= endingTime && !recovered; time += DAY) {
      mintedThisFrame = circulation * (1 - target / price);
      circulation += mintedThisFrame;
      price = demand / circulation * target;
      record(time);
      recovered = price - target < PRICE_NOISE;
    }
    if (!recovered && frames[frames.length - 1].time < endingTime) {
      mintedThisFrame = 0;
      record(endingTime);
    }
    return { frames, points: frames.map(frame => ({ x: frame.time, y: frame.price })),
      recovered, elapsedHours: frames[frames.length - 1].elapsedHours };
  }
}
