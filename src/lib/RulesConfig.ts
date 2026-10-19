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
  btcReserveTaperPct: number;
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
  speculativeLatencyLow: number;
  speculativeLatencyHigh: number;
  speculativeStartingDailyInflow: number;
  speculativeMaxDailyGrowth: number;
  speculativeDailyInflowCeiling: number;
  speculativeDailyTaper: number;
  speculativeWeakReturnStopHours: number;
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
  btcMaxTxnsPerHour: 10_000,
  btcReserveTaperPct: 60, // Taper over the final 60% of initially spendable BTC.
  unvaultLatencyInHours: 6,
  fearSelloffDelayInDays: 2,

  enableCertaintyGreed: false,
  certaintyGreedLow: 2,
  certaintyGreedHigh: 20,
  certaintyLatencyLow: 12,
  certaintyLatencyHigh: 48,
  certaintyMaxDailyIncrease: 1, // Fraction of prior capital per day: 0.5 = 50%, not 0.5%.

  enableSpeculativeGreed: true,
  speculativeGreedLow: 50, // APR
  speculativeGreedHigh: 100, // APR
  speculativeLatencyLow: 6,
  speculativeLatencyHigh: 12,
  speculativeStartingDailyInflow: 0.0015, // Fraction of prior-day capital used to seed buying.
  speculativeMaxDailyGrowth: 0.5, // Buying rate grows by at most 10% per day.
  speculativeDailyInflowCeiling: 0.002, // Fraction of activation capital per day.
  speculativeDailyTaper: 0.5, // Reduce buying rate by 50% per weak-return day.
  speculativeWeakReturnStopHours: 24,
};

export default rules;
