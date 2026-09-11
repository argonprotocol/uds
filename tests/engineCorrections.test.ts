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
  }, [previous], new Vault(previous.nextDate));
  expect(current.capitalAddedMap.SpeculativeGreed).toBeCloseTo(25, 8);
});
