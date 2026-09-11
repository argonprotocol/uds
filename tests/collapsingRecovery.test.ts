import { expect, test } from 'vitest';
import BlockchainRunner, { TERRA_COLLAPSE_DATE, TERRA_LAUNCH_DATE } from '../src/engine/BlockchainRunner';
import rules from './helpers/rules';
import IRules from '../src/interfaces/IRules';

test("test collapsing recovery", () => {
  const customRules = { ...rules, btcMaxTxnsPerHour: 1000 };
  const runner = new BlockchainRunner(customRules);
  const { markers } = runner.runCollapsingRecovery();
  const lastMarker = markers[markers.length - 1];

  let daysToRecover = 0;
  let daysStable = 0;
  for (const marker of markers) {
    daysStable = marker.endingPrice === 1 ? daysStable + 1 : 0;
    if (daysStable < 5) daysToRecover++;
  }

  expect(daysToRecover).toBe(53);
  // Corrected pending-ratchet allocation and date-dependent valuations.
  expect(lastMarker.endingVaultMeta.bitcoinCount).toBeCloseTo(79_322.84264021892, 8);
  expect(lastMarker.startingPrice).toBe(1.00);
  expect(lastMarker.endingPrice).toBe(1.00);
});

test("test collapsing recovery with high txns", () => {
  const customRules: IRules = {
    circulation: 18_700_000_000,
    startDateOfTerraCollapse: '2022/05/09',
  
    dollarInflation: 3.5,
  
    enableTaxation: true,
    maxTransactionsAnnually: 1_000_000_000,
    maxMicropaymentsAnnually: 18_700_000,
  
    enableBitcoinVaulting: true,
    btcVaultCapacityPct: 100,
    btcRatchetingPct: 100,
    btcRatchetWhenPriceChangePct: 10,
    btcPriceOverride: 34_082.21,
    btcMaxTxnsPerHour: 4000,
    unvaultLatencyInHours: 120,
  
    enableCertaintyGreed: false,
    certaintyGreedLow: 2,
    certaintyGreedHigh: 20,
    certaintyLatencyLow: 24,
    certaintyLatencyHigh: 48,
    certaintyMaxDailyIncrease: 0.5,
  
    enableSpeculativeGreed: false,
    speculativeGreedLow: 10,
    speculativeGreedHigh: 20,
    speculativeGreedWithinHours: 24,
    speculativeLatencyLow: 24,
    speculativeLatencyHigh: 48,
    speculativeMaxDailyIncrease: 0.5,
  };

  const runner = new BlockchainRunner(customRules);
  const { markers: dailyMarkers } = runner.runCollapsingRecovery();
  const lastMarker = dailyMarkers[dailyMarkers.length - 1];

  expect(lastMarker.startingPrice).toBe(1.00);
  expect(lastMarker.endingPrice).toBe(1.00);
});
