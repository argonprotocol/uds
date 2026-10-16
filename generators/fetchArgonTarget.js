import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { readMainnetSnapshot } from '../src/lib/MainnetSnapshot.ts';

const source = 'https://argon.network/data/argonBasics.mainnet.json';

export async function updateMainnetSnapshot({
  fetchImpl = globalThis.fetch,
  destination = new URL('../src/data/argonBasics.json', import.meta.url),
} = {}) {
  const temporary = new URL(`${destination.href}.tmp`);
  try {
    const response = await fetchImpl(source, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const snapshot = await response.json();
    const defaults = readMainnetSnapshot(snapshot);
    mkdirSync(new URL('.', destination), { recursive: true });
    writeFileSync(temporary, JSON.stringify(snapshot, null, 2) + '\n');
    renameSync(temporary, destination);
    return defaults;
  } catch (error) {
    rmSync(temporary, { force: true });
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const data = await updateMainnetSnapshot();
    console.log(`Mainnet snapshot ${data.lastUpdatedAt} (block ${data.currentBlockNumber}): ${data.circulation} ARGN, ${data.bitcoinsInLiquidLocks} BTC locked, target $${data.usdTargetForArgon}`);
  } catch (error) {
    console.error('Unable to update mainnet snapshot:', error.message);
    process.exitCode = 1;
  }
}
