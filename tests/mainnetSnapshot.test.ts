import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readMainnetSnapshot } from '../src/lib/MainnetSnapshot';
import { mainnetDefaults } from '../src/lib/RulesConfig';
import snapshot from '../src/data/argonBasics.json';
import { updateMainnetSnapshot } from '../generators/fetchArgonTarget.js';

const folders: string[] = [];
afterEach(() => folders.splice(0).forEach(folder => rmSync(folder, { recursive: true, force: true })));
function destination() {
  const folder = mkdtempSync(join(tmpdir(), 'sds-mainnet-'));
  folders.push(folder);
  return pathToFileURL(join(folder, 'snapshot.json'));
}

describe('published mainnet snapshot defaults', () => {
  it('converts microgons to fractional ARGN and keeps BTC in BTC units', () => {
    const data = { ...snapshot, microgonsInCirculation: { total: '2460667684141n' }, vaulting: { bitcoinLocked: 2.32871588 } };
    expect(readMainnetSnapshot(data).circulation).toBe(2460667.684141);
    expect(readMainnetSnapshot(data).bitcoinsInLiquidLocks).toBe(2.32871588);
    expect(mainnetDefaults).toEqual(readMainnetSnapshot(snapshot));
  });

  it('accepts zero locked BTC but rejects malformed or nonfinite defaults', () => {
    expect(readMainnetSnapshot({ ...snapshot, vaulting: { bitcoinLocked: 0 } }).bitcoinsInLiquidLocks).toBe(0);
    for (const invalid of [
      { ...snapshot, microgonsInCirculation: { total: '2460667' } },
      { ...snapshot, microgonsInCirculation: { total: '0n' } },
      { ...snapshot, vaulting: { bitcoinLocked: -1 } },
      { ...snapshot, vaulting: { bitcoinLocked: Infinity } },
      { ...snapshot, lastUpdatedAt: 'invalid' },
      { ...snapshot, usdTargetForArgon: 0 },
      { ...snapshot, currentBlockNumber: -1 },
    ]) expect(() => readMainnetSnapshot(invalid)).toThrow();
  });

  it('saves the entire downloaded snapshot including extra fields', async () => {
    const file = destination();
    const full = { ...snapshot, additionalPublisherData: { retained: true } };
    await updateMainnetSnapshot({ destination: file, fetchImpl: async () => ({ ok: true, json: async () => full }) });
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(full);
    expect(existsSync(new URL(`${file.href}.tmp`))).toBe(false);
  });

  it('keeps the previous file on invalid data or failed download', async () => {
    const file = destination();
    writeFileSync(file, 'previous snapshot');
    await expect(updateMainnetSnapshot({ destination: file, fetchImpl: async () => ({ ok: true, json: async () => ({}) }) })).rejects.toThrow();
    await expect(updateMainnetSnapshot({ destination: file, fetchImpl: async () => { throw new Error('network failed'); } })).rejects.toThrow('network failed');
    expect(readFileSync(file, 'utf8')).toBe('previous snapshot');
    expect(existsSync(new URL(`${file.href}.tmp`))).toBe(false);
  });
});
