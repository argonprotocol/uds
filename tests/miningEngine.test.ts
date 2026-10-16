import { describe, expect, it } from 'vitest';
import MiningEngine from '../src/engine/MiningEngine';
import rules, { mainnetDefaults } from '../src/lib/RulesConfig';
import type { RecoveryRequest } from '../src/lib/RecoveryRunner';

const DAY = 86_400_000;
const engine = new MiningEngine();
const request: RecoveryRequest = { startingTime: 0, endingTime: 30 * DAY, startingPrice: 1.2,
  lockedBitcoins: mainnetDefaults.bitcoinsInLiquidLocks, rules };

describe('daily mining stabilization', () => {
  it('splits issuance evenly and accounts for BTC Liquids while conserving demand', () => {
    const original = structuredClone(request);
    const result = engine.run(request);
    const first = result.frames[1];
    expect(first.time).toBe(DAY);
    expect(first.argonsMinted).toBeCloseTo(rules.circulation * (1 - rules.usdTargetForArgon / 1.2), 6);
    expect(result.recovered).toBe(true);
    expect(result.frames.at(-1)!.price - rules.usdTargetForArgon).toBeLessThan(0.001);
    for (const frame of result.frames) {
      expect(frame.circulation * frame.price).toBeCloseTo(rules.circulation * request.startingPrice, 6);
      expect(frame.argonsBurned).toBe(0);
      expect(frame.bitcoinsUnlocked).toBe(0);
      expect(frame.miningArgonsMinted).toBe(frame.argonsMinted! / 2);
      expect(frame.bitcoinArgonsMinted).toBe(frame.argonsMinted! / 2);
      expect(frame.bitcoinsAdded).toBeCloseTo(frame.bitcoinArgonsMinted! * rules.usdTargetForArgon / rules.btcPriceOverride, 10);
      expect(frame.bitcoinsRemaining).toBe(request.lockedBitcoins + frame.bitcoinsAdded!);
      expect(frame.price).toBeGreaterThanOrEqual(rules.usdTargetForArgon);
    }
    expect(request).toEqual(original);
  });

  it('does not mint before a full daily frame or inside the price noise band', () => {
    const short = engine.run({ ...request, endingTime: DAY / 2 });
    expect(short.recovered).toBe(false);
    expect(short.frames.at(-1)!.argonsMinted).toBe(0);
    expect(short.frames.at(-1)!.time).toBe(DAY / 2);
    const noise = engine.run({ ...request, startingPrice: rules.usdTargetForArgon + 0.0005 });
    expect(noise.recovered).toBe(true);
    expect(noise.elapsedHours).toBe(0);
    expect(noise.frames[0].argonsMinted).toBe(0);
  });

  it('can stabilize a shock at the original chart edge when given a full moving window', () => {
    const startingTime = 30 * DAY;
    const result = engine.run({ ...request, startingTime, endingTime: startingTime + 30 * DAY });
    expect(result.recovered).toBe(true);
    expect(result.frames[1].time).toBe(startingTime + DAY);
    expect(result.frames.at(-1)!.time).toBeGreaterThan(startingTime);
    expect(result.frames.at(-1)!.time).toBeLessThanOrEqual(startingTime + 30 * DAY);
  });

  it('assumes new BTC participation even without existing BTC and rejects invalid inputs', () => {
    expect(engine.run({ ...request, lockedBitcoins: 0 }).recovered).toBe(true);
    for (const startingPrice of [NaN, Infinity, 0.5]) {
      expect(() => engine.run({ ...request, startingPrice })).toThrow();
    }
    for (const btcPriceOverride of [0, -1, NaN, Infinity]) {
      expect(() => engine.run({ ...request, rules: { ...rules, btcPriceOverride } })).toThrow();
    }
  });
});
