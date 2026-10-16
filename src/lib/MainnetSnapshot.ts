export interface MainnetDefaults {
  circulation: number;
  bitcoinsInLiquidLocks: number;
  usdTargetForArgon: number;
  lastUpdatedAt: string;
  currentBlockNumber: number;
}

export function readMainnetSnapshot(value: unknown): MainnetDefaults {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid mainnet snapshot');
  const data = value as Record<string, any>;
  const { lastUpdatedAt, usdTargetForArgon, currentBlockNumber } = data;
  if (typeof lastUpdatedAt !== 'string' || !Number.isFinite(Date.parse(lastUpdatedAt)) ||
    typeof usdTargetForArgon !== 'number' || !Number.isFinite(usdTargetForArgon) || usdTargetForArgon <= 0 ||
    !Number.isSafeInteger(currentBlockNumber) || currentBlockNumber < 0) {
    throw new Error('Invalid mainnet target or snapshot metadata');
  }
  const amount = data.microgonsInCirculation?.total;
  if (typeof amount !== 'string' || !/^\d+n$/.test(amount)) throw new Error('Invalid mainnet circulation');
  const microgons = BigInt(amount.slice(0, -1));
  const wholeArgons = microgons / 1_000_000n;
  if (microgons <= 0n || wholeArgons > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Invalid mainnet circulation');
  const circulation = Number(wholeArgons) + Number(microgons % 1_000_000n) / 1_000_000;
  const bitcoinsInLiquidLocks = data.vaulting?.bitcoinLocked;
  if (typeof bitcoinsInLiquidLocks !== 'number' || !Number.isFinite(bitcoinsInLiquidLocks) || bitcoinsInLiquidLocks < 0) {
    throw new Error('Invalid mainnet locked BTC quantity');
  }
  return { circulation, bitcoinsInLiquidLocks, usdTargetForArgon, lastUpdatedAt, currentBlockNumber };
}
