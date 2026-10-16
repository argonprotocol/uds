import snapshot from '../data/argonBasics.json';
import { readMainnetSnapshot } from './MainnetSnapshot';

export const mainnetDefaults = readMainnetSnapshot(snapshot);

export interface IRules {
  usdTargetForArgon: number;
  targetUpdatedAt: string;
  circulation: number;
  startDateOfTerraCollapse: string;
  dollarInflation: number;
  enableTaxation: boolean;
  maxTransactionsAnnually: number;
  maxMicropaymentsAnnually: number;
  enableBitcoinVaulting: boolean;
  btcVaultCapacityPct: number;
  btcRatchetingPct: number;
  btcRatchetWhenPriceChangePct: number;
  btcPriceOverride: number;
  btcMaxTxnsPerHour: number;
  unvaultLatencyInHours: number;
  fearSelloffDelayInDays: number;
  enableCertaintyGreed: boolean;
  certaintyGreedLow: number;
  certaintyGreedHigh: number;
  certaintyLatencyLow: number;
  certaintyLatencyHigh: number;
  certaintyMaxDailyIncrease: number;
  enableSpeculativeGreed: boolean;
  speculativeGreedLow: number;
  speculativeGreedHigh: number;
  speculativeGreedWithinHours: number;
  speculativeLatencyLow: number;
  speculativeLatencyHigh: number;
  speculativeMaxDailyIncrease: number;
}

const rules = {
  usdTargetForArgon: mainnetDefaults.usdTargetForArgon,
  targetUpdatedAt: mainnetDefaults.lastUpdatedAt,
  circulation: mainnetDefaults.circulation,
  startDateOfTerraCollapse: '2022/05/09',

  dollarInflation: 3.5,

  enableTaxation: false,
  maxTransactionsAnnually: 1_000_000_000,
  maxMicropaymentsAnnually: 150_000_000,

  enableBitcoinVaulting: true,
  btcVaultCapacityPct: 100,
  btcRatchetingPct: 100,
  btcRatchetWhenPriceChangePct: 10,
  btcPriceOverride: 86_582.20,
  btcMaxTxnsPerHour: 25_000,
  unvaultLatencyInHours: 12,
  fearSelloffDelayInDays: 3,

  enableCertaintyGreed: true,
  certaintyGreedLow: 2,
  certaintyGreedHigh: 20,
  certaintyLatencyLow: 24,
  certaintyLatencyHigh: 48,
  certaintyMaxDailyIncrease: 1, // Fraction of prior capital per day: 0.5 = 50%, not 0.5%.

  enableSpeculativeGreed: false,
  speculativeGreedLow: 10,
  speculativeGreedHigh: 20,
  speculativeGreedWithinHours: 24,
  speculativeLatencyLow: 24,
  speculativeLatencyHigh: 48,
  speculativeMaxDailyIncrease: 0.5, // Fraction of prior capital per day: 0.5 = 50%.
};

export default rules;
