export default interface IRules {
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
