import { expect, test } from 'vitest';
import dayjs from 'dayjs';
import Vault from '../src/engine/Vault';
import { toUsd, toTargetUnits } from '../src/lib/ArgonTarget';
import rules from './helpers/rules';

test('price ratios and USD amounts use the frozen target', () => {
  expect(toUsd(1, 1.058)).toBe(1.058);
  expect(toUsd(0.5, 1.058)).toBe(0.529);
  expect(toTargetUnits(80_000, 1.058)).toBeCloseTo(75_614.3667, 4);
});

test('Bitcoin minting, redemption, and USD profits use separate units', () => {
  const vault = new Vault(dayjs.utc('2022-01-01'), 2);
  vault.setPricePerBtcOverride(80_000);
  vault.loadForDate(200_000, dayjs.utc('2022-01-01'), rules);
  expect(vault.bitcoinCount).toBe(2.5);
  expect(vault.argonsMintedByBitcoins).toBe(100_000);
  expect(vault.dollarsPerBitcoinUnlock).toBe(80_000);
  expect(vault.exportMeta(1).argonBurnCapacity).toBe(100_000);
  expect(vault.exportMeta(1).argonsBurnedPerBitcoinDollar).toBe(0.5);
  expect(vault.argonsNeededToUnlock(1, 0.5)).toBe(54_024);
  expect(vault.burnCirculation(100_000, 0.5, 1)).toBe(54_024);
  expect(vault.bitcoinCount).toBe(1.5);
  expect(vault.profitsToDate).toBe(25_976);

  const restored = Vault.fromJson(vault.toJson());
  expect(restored.usdTargetForArgon).toBe(2);
  expect(restored.exportMeta(0.5)).toEqual(vault.exportMeta(0.5));
});

test('ratchet minting is in ARGN and reported gains are in USD', () => {
  const vault = new Vault(dayjs.utc('2022-01-01'), 2);
  vault.setPricePerBtcOverride(80_000);
  vault.loadForDate(160_000, dayjs.utc('2022-01-01'), rules);
  vault.setPricePerBtcOverride(120_000);
  vault.loadForDate(320_000, dayjs.utc('2022-01-02'), rules);
  expect(vault.argonsMintedByBitcoins).toBeCloseTo(160_000, 6);
  expect(vault.profitsToDate).toBe(80_000);
  expect(vault.getTotalPendingRatchetValue()).toBe(0);
});

test('partial redemption preserves pending ratchet value at a non-dollar target', () => {
  const vault = new Vault(dayjs.utc('2022-01-01'), 2);
  vault.setPricePerBtcOverride(80_000);
  vault.loadForDate(200_000, dayjs.utc('2022-01-01'), rules);
  vault.setPricePerBtcOverride(120_000);
  vault.loadForDate(200_000, dayjs.utc('2022-01-02'), rules);
  expect(vault.getTotalPendingRatchetValue()).toBe(50_000);
  expect(vault.burnCirculation(40_000, 1, 1)).toBe(40_000);
  expect(vault.getTotalPendingRatchetValue()).toBe(30_000);
});

test('invalid targets cannot enter engine accounting', () => {
  for (const target of [0, -1, NaN, Infinity]) {
    expect(() => new Vault(dayjs.utc('2022-01-01'), target)).toThrow();
  }
});
