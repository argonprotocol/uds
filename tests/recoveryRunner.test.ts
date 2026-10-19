import { describe, expect, it } from 'vitest';
import { runRecovery, recoveryFrameAt, type RecoveryRequest, type RecoveryFrame } from '../src/lib/RecoveryRunner';
import baseRules from './helpers/rules';
import mainnetRules, { mainnetDefaults } from '../src/lib/RulesConfig';

const HOUR = 3_600_000;
function request(overrides: Partial<RecoveryRequest> = {}): RecoveryRequest {
  const startingTime = Date.UTC(2030, 0, 1);
  return {
    startingTime, endingTime: startingTime + 720 * HOUR,
    startingPrice: 0.5, lockedBitcoins: 1_600_000,
    rules: { ...baseRules, circulation: 2_200_000, usdTargetForArgon: 1.058,
      enableTaxation: false, enableCertaintyGreed: false, enableSpeculativeGreed: false,
      unvaultLatencyInHours: 120 },
    ...overrides,
  };
}

describe('interactive recovery runner', () => {
  it('waits three flatline days with BTC protected before the selloff', () => {
    const input = request({ startingPrice: 0.7,
      lockedBitcoins: mainnetDefaults.bitcoinsInLiquidLocks,
      rules: { ...mainnetRules, enableTaxation: false, enableCertaintyGreed: false,
        enableSpeculativeGreed: false } });
    const immediate = runRecovery({ ...input, rules: { ...input.rules, fearSelloffDelayInDays: 0 } });
    const delayed = runRecovery(input);
    const immediateCrash = immediate.frames.find(frame => frame.price === 0.001)!;
    const delayedCrash = delayed.frames.find(frame => frame.price === 0.001)!;
    const stalls = delayed.frames.filter(frame => frame.reserveStall);
    expect(stalls).toHaveLength(1);
    const stall = stalls[0];
    expect(stall.bitcoinsRemaining).toBeGreaterThan(0);
    expect(stall.price).toBeLessThan(input.rules.usdTargetForArgon);
    expect(delayedCrash.elapsedHours - stall.elapsedHours).toBe(96);
    expect(immediate.frames.filter(frame => frame.reserveStall)).toHaveLength(1);
    expect(immediate.frames.find(frame => frame.reserveStall)!.elapsedHours).toBe(stall.elapsedHours);
    const stalledFrames = delayed.frames.filter(frame => frame.time >= stall.time && frame.time <= delayedCrash.time);
    expect(stalledFrames.every(frame => frame.bitcoinsRemaining === stall.bitcoinsRemaining)).toBe(true);
    expect(recoveryFrameAt(delayed.frames, stall.elapsedHours)).toEqual(stall);
    expect(recoveryFrameAt(delayed.frames, stall.elapsedHours + 0.5).reserveStall).toBeUndefined();
    expect(recoveryFrameAt(delayed.frames, stall.elapsedHours - 0.5).reserveStall).toBeUndefined();
    expect(delayedCrash.elapsedHours - immediateCrash.elapsedHours).toBe(72);
    expect(delayed.elapsedHours - immediate.elapsedHours).toBe(72);
    expect(delayed.recovered).toBe(true);
    const plateau = delayed.frames.filter(frame => frame.elapsedHours >= immediateCrash.elapsedHours - 24 &&
      frame.elapsedHours < delayedCrash.elapsedHours - 24);
    expect(plateau).toHaveLength(72);
    for (const frame of plateau) {
      expect(frame.price).toBeCloseTo(plateau[0].price, 10);
      expect(frame.bitcoinsRemaining).toBe(delayedCrash.bitcoinsRemaining);
      expect(frame.argonsBurned).toBe(delayedCrash.argonsBurned);
    }
    const short = runRecovery({ ...input, endingTime: delayedCrash.time - HOUR });
    expect(short.recovered).toBe(false);
    expect(short.frames.every(frame => frame.price > 0.001)).toBe(true);
    for (const delay of [-1, NaN, Infinity]) {
      expect(() => runRecovery({ ...input, rules: { ...input.rules, fearSelloffDelayInDays: delay } })).toThrow();
    }
  });

  it('protects BTC through a fear selloff and recovers the default $0.70 shock', () => {
    const input = request({ startingPrice: 0.7,
      lockedBitcoins: mainnetDefaults.bitcoinsInLiquidLocks,
      rules: { ...mainnetRules, enableTaxation: false, enableCertaintyGreed: false,
        enableSpeculativeGreed: false } });
    const streamed: RecoveryFrame[] = [];
    const result = runRecovery(input, batch => streamed.push(...batch));
    const crashIndex = result.frames.findIndex(frame => frame.price === 0.001);
    expect(crashIndex).toBeGreaterThan(1);
    const before = result.frames[crashIndex - 1], crash = result.frames[crashIndex];
    expect(result.frames.filter(frame => frame.selloffBottom)).toEqual([crash]);
    expect(recoveryFrameAt(result.frames, crash.elapsedHours)).toEqual(crash);
    expect(recoveryFrameAt(result.frames, crash.elapsedHours - 0.5).selloffBottom).toBeUndefined();
    expect(recoveryFrameAt(result.frames, crash.elapsedHours + 0.5).selloffBottom).toBeUndefined();
    expect(crash.bitcoinsRemaining).toBeGreaterThan(0);
    expect(crash.bitcoinsRemaining).toBe(before.bitcoinsRemaining);
    expect(crash.circulation).toBe(before.circulation);
    expect(crash.argonsBurned).toBe(before.argonsBurned);
    const fall = result.frames.slice(crashIndex - 24, crashIndex + 1);
    expect(fall).toHaveLength(25);
    expect(crash.elapsedHours - fall[0].elapsedHours).toBe(24);
    for (let index = 1; index < fall.length; index++) {
      expect(fall[index].price).toBeLessThan(fall[index - 1].price);
      expect(fall[index].bitcoinsRemaining).toBe(fall[0].bitcoinsRemaining);
      expect(fall[index].circulation).toBe(fall[0].circulation);
      expect(fall[index].argonsBurned).toBe(fall[0].argonsBurned);
    }
    expect(fall[12].price).toBeCloseTo((fall[0].price + 0.001) / 2, 10);
    expect(fall[1].price - fall[0].price).toBeGreaterThan(fall[12].price - fall[11].price);
    const truncated = runRecovery({ ...input, endingTime: fall[12].time });
    expect(truncated.recovered).toBe(false);
    expect(truncated.frames.at(-1)).toEqual(fall[12]);
    expect(result.frames[crashIndex + 1].bitcoinsRemaining).toBeLessThan(crash.bitcoinsRemaining);
    expect(result.recovered).toBe(true);
    expect(result.frames.at(-1)!.price).toBe(input.rules.usdTargetForArgon);
    expect(streamed).toEqual(result.frames);
    expect(streamed.filter(frame => frame.reserveStall)).toHaveLength(1);
    expect(streamed.filter(frame => frame.selloffBottom)).toEqual([crash]);
    const beforeBottom = runRecovery({ ...input, endingTime: crash.time - HOUR });
    expect(beforeBottom.frames.some(frame => frame.selloffBottom)).toBe(false);
    for (const frame of result.frames) {
      expect(frame.argonsBurned).toBeCloseTo(input.rules.circulation - frame.circulation, 6);
      expect(frame.bitcoinsUnlocked + frame.bitcoinsRemaining).toBeCloseTo(input.lockedBitcoins, 8);
      expect(frame.bitcoinsUnlocked).toBeLessThanOrEqual(frame.elapsedHours * input.rules.btcMaxTxnsPerHour + 1e-6);
    }
  });

  it('does not promise a reserve recovery with insufficient BTC or throughput', () => {
    const input = request({ startingPrice: 0.7, lockedBitcoins: 0.000001,
      rules: { ...mainnetRules, enableCertaintyGreed: false } });
    const insufficient = runRecovery(input);
    expect(insufficient.recovered).toBe(false);
    expect(insufficient.frames.some(frame => frame.reserveStall)).toBe(false);
    expect(insufficient.frames.every(frame => frame.bitcoinsRemaining === input.lockedBitcoins)).toBe(true);
    const blocked = runRecovery({ ...input, lockedBitcoins: mainnetDefaults.bitcoinsInLiquidLocks,
      rules: { ...input.rules, btcMaxTxnsPerHour: 0 } });
    expect(blocked.recovered).toBe(false);
    expect(blocked.frames.some(frame => frame.reserveStall)).toBe(false);
    for (const frame of blocked.frames) {
      expect(frame.price).toBeCloseTo(input.startingPrice, 10);
      expect(frame.bitcoinsUnlocked).toBe(0);
    }
  });

  it('recovers directly with ample BTC and respects a timeline ending at the selloff', () => {
    const input = request({ startingPrice: 0.7, lockedBitcoins: 30, rules: { ...mainnetRules } });
    const direct = runRecovery(input);
    expect(direct.recovered).toBe(true);
    expect(direct.frames.some(frame => frame.reserveStall)).toBe(false);
    expect(direct.frames.some(frame => frame.selloffBottom)).toBe(false);
    expect(direct.frames.every(frame => frame.price >= input.startingPrice)).toBe(true);
    const scarce = { ...input, lockedBitcoins: mainnetDefaults.bitcoinsInLiquidLocks };
    const full = runRecovery(scarce);
    const crash = full.frames.find(frame => frame.price === 0.001)!;
    const short = runRecovery({ ...scarce, endingTime: crash.time });
    expect(short.recovered).toBe(false);
    expect(short.frames.at(-1)!.price).toBe(0.001);
    expect(short.frames.at(-1)!.selloffBottom).toBe(true);
  });

  it('starts at the dragged USD price and date and recovers using locked BTC', () => {
    const input = request();
    const snapshot = structuredClone(input);
    const result = runRecovery(input);
    expect(result.points[0]).toEqual({ x: input.startingTime, y: input.startingPrice });
    expect(result.recovered).toBe(true);
    expect(result.elapsedHours).toBeGreaterThan(0);
    expect(result.points.at(-1)).toEqual({ x: input.startingTime + result.elapsedHours * HOUR, y: 1.058 });
    expect(input).toEqual(snapshot);
  });

  it('honors the BTC volume limit instead of guaranteeing a bounce', () => {
    const fast = request();
    const slower = request({ rules: { ...fast.rules, btcMaxTxnsPerHour: 0.001 } });
    const a = runRecovery(fast), b = runRecovery(slower);
    expect(a.recovered).toBe(true);
    expect(b.recovered).toBe(false);
    expect(b.points.at(-1)!.y).toBeLessThan(1.058);
  });

  it('allows a slow recovery to finish beyond the first month', () => {
    const input = request({ rules: { ...request().rules, btcMaxTxnsPerHour: 0.01 } });
    expect(runRecovery(input).recovered).toBe(false);
    const extended = runRecovery({ ...input, endingTime: Date.UTC(2030, 6, 1) });
    expect(extended.recovered).toBe(true);
    expect(extended.elapsedHours).toBeGreaterThan(720);
    expect(extended.points.at(-1)!.x).toBeLessThanOrEqual(Date.UTC(2030, 6, 1));
    expect(extended.points.at(-1)!.y).toBe(input.rules.usdTargetForArgon);
  });

  it('stops an unfinished recovery at the six-month deadline', () => {
    const input = request({ endingTime: Date.UTC(2030, 6, 1),
      rules: { ...request().rules, btcMaxTxnsPerHour: 0.001 } });
    const result = runRecovery(input);
    expect(result.recovered).toBe(false);
    expect(result.frames.at(-1)!.time).toBe(input.endingTime);
    expect(result.elapsedHours).toBe((input.endingTime - input.startingTime) / HOUR);
  });

  it('does not create locked BTC when quantity is zero', () => {
    const input = request({ lockedBitcoins: 0 });
    const result = runRecovery(input);
    expect(result.recovered).toBe(false);
    for (const point of result.points) expect(point.y).toBeCloseTo(0.5, 10);
    expect(result.points.at(-1)!.x).toBe(input.endingTime);
  });

  it('streams ordered snapshots with actual burn and unlock accounting', () => {
    const input = request({ rules: { ...request().rules, btcMaxTxnsPerHour: 0.01 } });
    const streamed: RecoveryFrame[] = [];
    const result = runRecovery(input, batch => streamed.push(...batch));
    expect(streamed).toEqual(result.frames);
    expect(result.frames.length).toBe(result.points.length);
    for (const frame of result.frames) {
      expect(frame.price).toBe(result.points[result.frames.indexOf(frame)].y);
      expect(frame.argonsBurned).toBeCloseTo(input.rules.circulation - frame.circulation, 6);
      expect(frame.bitcoinsUnlocked + frame.bitcoinsRemaining).toBeCloseTo(input.lockedBitcoins, 6);
      expect(frame.bitcoinsUnlocked).toBeLessThanOrEqual(frame.elapsedHours * input.rules.btcMaxTxnsPerHour + 1e-6);
    }
  });

  it('tracks tax burns separately from BTC unlocking', () => {
    const input = request({ lockedBitcoins: 0, rules: { ...request().rules, enableTaxation: true } });
    const result = runRecovery(input);
    const last = result.frames[result.frames.length - 1];
    expect(last.argonsBurned).toBeGreaterThan(0);
    expect(last.bitcoinsUnlocked).toBe(0);
    expect(last.bitcoinsRemaining).toBe(0);
    expect(last.price).toBeGreaterThan(input.startingPrice);
  });

  it('interpolates synchronized playback and clamps to real sample endpoints', () => {
    const result = runRecovery(request());
    const [a, b] = result.frames;
    const middle = recoveryFrameAt(result.frames, (a.elapsedHours + b.elapsedHours) / 2);
    expect(middle.price).toBeCloseTo((a.price + b.price) / 2, 10);
    expect(middle.time).toBe((a.time + b.time) / 2);
    expect(middle.argonsBurned).toBeCloseTo((a.argonsBurned + b.argonsBurned) / 2, 6);
    expect(middle.bitcoinsUnlocked).toBeCloseTo((a.bitcoinsUnlocked + b.bitcoinsUnlocked) / 2, 6);
    expect(recoveryFrameAt(result.frames, -1)).toEqual(a);
    expect(recoveryFrameAt(result.frames, Infinity)).toEqual(result.frames[result.frames.length - 1]);
  });

  it('handles zero price and an already recovered price', () => {
    expect(runRecovery(request({ startingPrice: 0 })).recovered).toBe(false);
    expect(runRecovery(request({ startingPrice: 1.058 })).elapsedHours).toBe(0);
  });

  it('rejects invalid inputs and respects short remaining timelines', () => {
    expect(() => runRecovery(request({ lockedBitcoins: -1 }))).toThrow();
    expect(() => runRecovery(request({ startingPrice: NaN }))).toThrow();
    const input = request();
    const result = runRecovery({ ...input, endingTime: input.startingTime + HOUR / 2 });
    expect(result.recovered).toBe(false);
    expect(result.points.at(-1)!.x).toBe(input.startingTime + HOUR / 2);
  });
});

it('records speculative activation events without interpolating them', () => {
  const input = request({ startingPrice: 0.5, lockedBitcoins: 100,
    rules: { ...mainnetRules, circulation: 2_200_000,
      enableTaxation: false, enableCertaintyGreed: false, enableSpeculativeGreed: true,
      speculativeGreedLow: 0, speculativeGreedHigh: 1,
      speculativeLatencyLow: 24, speculativeLatencyHigh: 48 } });
  const result = runRecovery(input);
  const event = result.frames.find(frame => frame.speculativeStarted);
  expect(event).toBeDefined();
  expect(event!.speculativeCapitalAdded).toBeGreaterThan(0);
  const between = recoveryFrameAt(result.frames, event!.elapsedHours + 0.5);
  expect(between.speculativeStarted).toBeUndefined();
  expect(between.speculativeCapitalAdded).toBeUndefined();
  const disabled = runRecovery({ ...input, rules: { ...input.rules, enableSpeculativeGreed: false } });
  expect(disabled.frames.some(frame => frame.speculativeStarted)).toBe(false);
});

it('waits for speculative price recovery to stop before counting flatline hours', () => {
  const startingTime = Date.UTC(2030, 0, 1);
  const result = runRecovery({ startingTime, endingTime: startingTime + 960 * HOUR,
    startingPrice: 0.3171817556727023, lockedBitcoins: 17_500_000,
    rules: { ...mainnetRules, circulation: 2_950_560_386_754.328,
      enableTaxation: false, enableCertaintyGreed: false, enableSpeculativeGreed: true,
      speculativeGreedLow: 100, speculativeGreedHigh: 200,
      speculativeLatencyLow: 12, speculativeLatencyHigh: 48,
      speculativeStartingDailyInflow: 0.0001, speculativeMaxDailyGrowth: 0.1,
      speculativeDailyInflowCeiling: 0.001, speculativeDailyTaper: 0.5,
      speculativeWeakReturnStopHours: 24, fearSelloffDelayInDays: 3 } });
  const stall = result.frames.find(frame => frame.reserveStall)!;
  expect(stall).toBeDefined();
  const stoppedBtc = result.frames.find(frame => frame.bitcoinsRemaining === stall.bitcoinsRemaining)!;
  const following = result.frames.find(frame => frame.elapsedHours === stoppedBtc.elapsedHours + 2)!;
  expect(following.price).toBeGreaterThan(stoppedBtc.price);
  expect(following.speculativeCapitalAdded).toBeGreaterThan(0);
  expect(stall.elapsedHours).toBeGreaterThan(following.elapsedHours);
  const lastBuying = result.frames.filter(frame => frame.elapsedHours < stall.elapsedHours &&
    (frame.speculativeCapitalAdded ?? 0) > 0).at(-1)!;
  expect(stall.elapsedHours).toBeGreaterThan(lastBuying.elapsedHours);
  const bottom = result.frames.find(frame => frame.selloffBottom)!;
  expect(bottom.elapsedHours - stall.elapsedHours).toBe(96);
});

it('rounds the full death-spiral reserve upward and scales with circulation and BTC valuation', async () => {
  const { minimumLockedBitcoins, crashRecoveryReserve, MAX_LOCKED_BITCOINS } = await import('../src/lib/RecoveryRunner');
  const config = { ...mainnetRules, circulation: 2_950_560_386_754.328 };
  const reserve = crashRecoveryReserve(config.circulation, config.usdTargetForArgon,
    config.btcPriceOverride / config.usdTargetForArgon);
  expect(reserve).toBeCloseTo(522_932.127, 3);
  expect(minimumLockedBitcoins(config)).toBe(522_933);
  expect(minimumLockedBitcoins({ ...config, circulation: config.circulation * 2 })).toBe(Math.ceil(reserve * 2));
  expect(minimumLockedBitcoins({ ...config, btcPriceOverride: config.btcPriceOverride / 2 })).toBe(Math.ceil(reserve * 2));
  expect(MAX_LOCKED_BITCOINS).toBe(17_500_000);
});

it('marks a six-month death spiral and continues through the bottom without repeating it', () => {
  const startingTime = Date.UTC(2030, 0, 1);
  const deadline = Date.UTC(2030, 6, 1);
  const result = runRecovery(request({ startingTime, endingTime: deadline + 48 * HOUR,
    rules: { ...baseRules, enableTaxation: false, enableCertaintyGreed: false,
      enableSpeculativeGreed: false, enableBitcoinVaulting: false } }));
  const events = result.frames.filter(frame => frame.sixMonthSelloff);
  expect(events).toHaveLength(1);
  const event = events[0];
  expect(event.time).toBe(deadline);
  expect(event.price).toBe(0.5);
  const bottom = result.frames.find(frame => frame.selloffBottom)!;
  expect(bottom.elapsedHours - event.elapsedHours).toBe(24);
  expect(bottom.price).toBe(0.001);
  expect(bottom.bitcoinsRemaining).toBe(event.bitcoinsRemaining);
  expect(result.frames.at(-1)!.time).toBeGreaterThan(bottom.time);
  expect(recoveryFrameAt(result.frames, event.elapsedHours + 0.5).sixMonthSelloff).toBeUndefined();
});

it('does not trigger the six-month event when recovery finishes earlier', () => {
  const input = request({ endingTime: Date.UTC(2031, 0, 1), startingPrice: 0.7,
    lockedBitcoins: 17_500_000,
    rules: { ...mainnetRules, circulation: 2_950_560_386_754.328,
      btcMaxTxnsPerHour: 1_000_000, unvaultLatencyInHours: 6,
      enableSpeculativeGreed: false, enableCertaintyGreed: false, enableTaxation: false } });
  const result = runRecovery(input);
  expect(result.recovered).toBe(true);
  expect(result.frames.some(frame => frame.sixMonthSelloff)).toBe(false);
});

it('tapers the unlock cap across the final 60% of spendable BTC without consuming the reserve', () => {
  const startingTime = Date.UTC(2030, 0, 1);
  const input = { startingTime, endingTime: startingTime + 180 * 24 * HOUR,
    startingPrice: 0.207, lockedBitcoins: 17_500_000,
    rules: { ...mainnetRules, circulation: 2_950_560_386_754.328,
      btcMaxTxnsPerHour: 127_000, unvaultLatencyInHours: 6,
      btcReserveTaperPct: 60, enableTaxation: false, enableCertaintyGreed: false,
      enableSpeculativeGreed: true, speculativeGreedLow: 50, speculativeGreedHigh: 100,
      speculativeLatencyLow: 6, speculativeLatencyHigh: 12,
      speculativeStartingDailyInflow: 0.0015, speculativeMaxDailyGrowth: 0.5,
      speculativeDailyInflowCeiling: 0.002, speculativeDailyTaper: 0.5,
      speculativeWeakReturnStopHours: 24 } };
  const tapered = runRecovery(input);
  const baseline = runRecovery({ ...input, rules: { ...input.rules, btcReserveTaperPct: 0 } });
  expect(tapered.recovered).toBe(true);
  expect(tapered.frames.some(frame => frame.selloffBottom)).toBe(false);
  expect(tapered.elapsedHours).toBeGreaterThan(baseline.elapsedHours);
  const final = tapered.frames.at(-1)!;
  expect(final.bitcoinsRemaining).toBeGreaterThanOrEqual(522_932.127);
  expect(final.bitcoinsUnlocked).toBeLessThan(baseline.frames.at(-1)!.bitcoinsUnlocked);
  const band = (17_500_000 - 522_932.12741769) * 0.6;
  const before = tapered.frames[80], after = tapered.frames[81];
  const remaining = before.bitcoinsRemaining - 522_932.12741769;
  expect(remaining).toBeLessThan(band);
  expect(after.bitcoinsUnlocked - before.bitcoinsUnlocked).toBeCloseTo(127_000 * remaining / band, 3);
});
