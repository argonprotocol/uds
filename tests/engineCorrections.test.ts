import { expect, test } from 'vitest';
import dayjs from 'dayjs';
import Vault from '../src/engine/Vault';
import Marker from '../src/engine/Marker';
import rules from '../src/lib/RulesConfig';

function pendingVault() {
  return Vault.fromJson({
    argonsMintedByBitcoins: 50_000,
    byDate: {
      '2022-01-01': {
        date: '2022-01-01', nonRatchetedQty: 0, nonRatchetedPrice: 20_000,
        ratchetedQty: 5, ratchetedPrice: 20_000, pendingRatchetValue: 50_000,
      },
    },
    ratchetMintingSpace: 0, currentDate: '2022-01-01',
    pricePerBtcOverride: 20_000, profitsByDate: {},
  });
}

test('partial redemption preserves pending value per remaining bitcoin', () => {
  const vault = pendingVault();
  expect(vault.burnCirculation(10_000, 1, 1)).toBe(10_000);
  expect(vault.toJson().byDate['2022-01-01'].pendingRatchetValue).toBe(40_000);
  expect(vault.getTotalLockValue()).toBe(40_000);
  expect(vault.argonsMintedByBitcoins).toBe(40_000);
  expect(vault.burnCirculation(40_000, 1, 4)).toBe(40_000);
  expect(vault.bitcoinCount).toBe(0);
  expect(vault.getTotalPendingRatchetValue()).toBe(0);
});

test('a full ratcheted redemption leaves other positions finite', () => {
  const data = pendingVault().toJson();
  data.byDate['2022-01-01'].nonRatchetedQty = 1;
  const vault = Vault.fromJson(data);
  // Consume the non-ratcheted BTC, then the full pending-ratchet position.
  expect(vault.burnCirculation(70_000, 1, 6)).toBe(70_000);
  expect(vault.bitcoinCount).toBe(0);
  expect(vault.getTotalLockValue()).toBe(0);
});

test('changing the valuation date refreshes unlock values and dated profits', () => {
  const data = pendingVault().toJson();
  data.pricePerBtcOverride = undefined;
  data.byDate['2022-01-01'].pendingRatchetValue = 0;
  data.byDate['2022-01-01'].ratchetedPrice = 40_000;
  data.currentDate = '2022-05-09';
  data.profitsByDate = { '2022-06-09': 100 };
  const vault = Vault.fromJson(data);
  expect(vault.dollarsPerBitcoinUnlock).toBe(30_175.71);
  expect(vault.profitsToDate).toBe(0);
  vault.setDate(dayjs.utc('2022-06-09'));
  expect(vault.dollarsPerBitcoinUnlock).toBe(30_083.46);
  expect(vault.profitsToDate).toBe(100);
});

test('speculative demand waits for its own minimum latency', () => {
  const previous = new Marker(dayjs.utc('2022-01-01'), 24, 100, 50);
  previous.pctIncreaseFromAllSources = 30;
  const current = new Marker(previous.nextDate, 24, 100, 50);
  current.runRecovery({
    ...rules, enableTaxation: false, enableBitcoinVaulting: false,
    enableCertaintyGreed: false, enableSpeculativeGreed: true,
    certaintyLatencyLow: 0, speculativeLatencyLow: 48, speculativeLatencyHigh: 48,
  }, [previous], new Vault(previous.nextDate));
  expect(current.capitalAdded).toBe(0);
});

test('certainty latency does not delay eligible speculative demand', () => {
  const previous = new Marker(dayjs.utc('2022-01-01'), 24, 100, 50);
  previous.pctIncreaseFromAllSources = 30;
  const current = new Marker(previous.nextDate, 24, 100, 50);
  current.runRecovery({
    ...rules, enableTaxation: false, enableBitcoinVaulting: false,
    enableCertaintyGreed: false, enableSpeculativeGreed: true,
    certaintyLatencyLow: 48, speculativeLatencyLow: 24, speculativeLatencyHigh: 48,
    speculativeStartingDailyInflow: 0.5, speculativeDailyInflowCeiling: 0.5,
  }, [previous], new Vault(previous.nextDate));
  expect(current.capitalAddedMap.SpeculativeGreed).toBeCloseTo(25, 8);
});

for (const duration of [1, 24]) {
  test(`speculative demand uses simple APR for ${duration}-hour intervals`, () => {
    function capitalAtApr(aprs: number[]) {
      const history = aprs.map((apr, index) => {
        const marker = new Marker(dayjs.utc('2022-01-01').add(index * duration, 'hour'), duration, 100, 50);
        marker.pctIncreaseFromAllSources = apr * duration / (365 * 24);
        return marker;
      });
      const current = new Marker(history.at(-1)!.nextDate, duration, 100, 50);
      current.runRecovery({
        ...rules, enableTaxation: false, enableBitcoinVaulting: false,
        enableCertaintyGreed: false, enableSpeculativeGreed: true,
        speculativeGreedLow: 5, speculativeGreedHigh: 20,
        speculativeLatencyLow: 24, speculativeLatencyHigh: 48,
        speculativeStartingDailyInflow: 0.5, speculativeDailyInflowCeiling: 0.5,
      }, history, new Vault(current.startingDate));
      return current.capitalAddedMap.SpeculativeGreed || 0;
    }
    const count = 24 / duration;
    expect(capitalAtApr(Array(count).fill(4))).toBe(0);
    expect(capitalAtApr(Array(count).fill(5))).toBe(0);
    // Once qualified, activation seeds the full configured starting inflow.
    expect(capitalAtApr(Array(count).fill(12.5))).toBeCloseTo(0.5 / 24 * duration * 50, 8);
    expect(capitalAtApr(Array(count).fill(20))).toBeCloseTo(0.5 / 24 * duration * 50, 8);
    const interrupted = Array(count).fill(20);
    interrupted[count - 1] = 4;
    expect(capitalAtApr(interrupted)).toBe(0);
  });
}

test('speculative buying grows from a persistent rate, freezes its ceiling, and tapers before stopping', () => {
  const config = { ...rules, enableTaxation: false, enableBitcoinVaulting: false,
    enableCertaintyGreed: false, enableSpeculativeGreed: true,
    speculativeGreedLow: 5, speculativeGreedHigh: 20,
    speculativeLatencyLow: 24, speculativeLatencyHigh: 48,
    speculativeStartingDailyInflow: 0.0001, speculativeMaxDailyGrowth: 0.1,
    speculativeDailyInflowCeiling: 0.001, speculativeDailyTaper: 0.5,
    speculativeWeakReturnStopHours: 24 };
  const history = Array.from({ length: 24 }, (_, hour) => {
    const marker = new Marker(dayjs.utc('2022-01-01').add(hour, 'hour'), 1, 1000, 500);
    marker.pctIncreaseFromAllSources = 30 / 8760;
    return marker;
  });
  function step(apr: number, circulation = 1000, capital = 500) {
    const marker = new Marker(history.at(-1)!.nextDate, 1, circulation, capital);
    marker.runRecovery(config, history, new Vault(marker.startingDate));
    // Supply the next interval's observed return independently of inflow size.
    marker.pctIncreaseFromAllSources = apr / 8760;
    history.push(marker);
    return marker.capitalAddedMap.SpeculativeGreed || 0;
  }
  const first = step(30);
  expect(first).toBeCloseTo(500 * 0.0001 / 24, 12);
  let inflow = first;
  for (let hour = 0; hour < 24; hour++) inflow = step(30, 900, 600);
  expect(inflow).toBeCloseTo(first * 1.1, 12);
  for (let hour = 0; hour < 700; hour++) inflow = step(30, 900, 600);
  expect(inflow).toBeCloseTo(500 * 0.001 / 24, 12);
  step(0); // This interval reports the first weak return.
  const tapered = step(0);
  expect(tapered).toBeCloseTo(inflow * Math.pow(0.5, 1 / 24), 12);
  for (let hour = 0; hour < 23; hour++) inflow = step(0);
  expect(inflow).toBe(0);
  for (let hour = 0; hour < 24; hour++) expect(step(30)).toBe(0);
  expect(step(30)).toBeGreaterThan(0);
  expect(step(30, 500, 500)).toBe(0); // No excess supply at target.
});
