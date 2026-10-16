// URL quantities are ARGN and BTC, rather than microgons or satoshis.
export function readUrlInputs(search: string): { circulation?: number; bitcoinsInLiquidLocks?: number } {
  const params = new URLSearchParams(search);
  const result: { circulation?: number; bitcoinsInLiquidLocks?: number } = {};
  for (const key of ['circulation', 'bitcoinsInLiquidLocks'] as const) {
    const raw = params.get(key)?.trim();
    if (!raw || !/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw)) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || (key === 'circulation' ? value <= 0 : value < 0)) continue;
    result[key] = value;
  }
  return result;
}
