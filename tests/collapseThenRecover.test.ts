import { expect, test } from 'vitest';
import BlockchainRunner, { TERRA_COLLAPSE_DATE, TERRA_LAUNCH_DATE } from '../src/engine/BlockchainRunner';
import dayjs from 'dayjs';
import rules from './helpers/rules';
import IRules from '../src/interfaces/IRules';

const vaultMetaBeforeRecovery = {
  argonBurnCapacity: 6_456_644_240.317682,
  argonRatioPrice: 1,
  argonsBurnedPerBitcoinDollar: 1,
  bitcoinCount: 198_423.6610318361,
  dollarsPerBitcoinLock: 35_788.661922,
  dollarsPerBitcoinUnlock: 32_539.6891013,
  profitsToDate: 700_794_416.2318723,
  argonsMintedByBitcoins: 9_350_000_000.000013,
}

test("test launch", () => {
  const runner = new BlockchainRunner(rules);
  const { markers, phases } = runner.runCollapseThenRecover();
  const launchMarkers = markers.slice(phases.launch?.firstItem as number, phases.launch?.lastItem as number + 1);
  const firstMarker = launchMarkers[0];
  const lastMarker = launchMarkers[launchMarkers.length - 1];

  for (const marker of launchMarkers) {
    expect(marker.endingPrice).toBe(1.00);
  }

  expect(firstMarker.startingDate).toBe('2020-10-01T00:00:00.000Z');
  expect(lastMarker.endingVaultMeta).toEqual(vaultMetaBeforeRecovery);
  expect(lastMarker.endingDate).toBe('2022-05-08T23:59:59.999Z');
  expect(lastMarker.endingPrice).toBe(1.00);
  expect(Math.round(lastMarker.endingCirculation)).toBe(18_700_000_000);
  expect(Math.round(lastMarker.endingCapital)).toBe(18_700_000_000);
});

test("test collapse", () => {
  const runner = new BlockchainRunner(rules);
  const { markers, phases } = runner.runCollapseThenRecover();
  const collapseMarkers = markers.slice(phases.collapse?.firstItem as number, phases.collapse?.lastItem as number + 1);
  const lastMarker = collapseMarkers[collapseMarkers.length - 1];

  expect(lastMarker.endingDate).toBe('2022-06-29T23:59:59.999Z');
  expect(lastMarker.endingPrice).toBe(0.001);
});

test("test recovery", () => {
  const runner = new BlockchainRunner(rules);
  const { markers, phases } = runner.runCollapseThenRecover();
  const recoveryMarkers = markers.slice(phases.recovery?.firstItem as number, phases.recovery?.lastItem as number + 1);
  const lastMarker = recoveryMarkers[recoveryMarkers.length - 1];

  expect(lastMarker.startingPrice).toBe(1.00);
  expect(lastMarker.endingPrice).toBe(1.00);
});

test("test recovery without bitcoin", () => {
  const customRules: IRules = { ...rules, enableBitcoinVaulting: false, enableSpeculativeGreed: false };
  const runner = new BlockchainRunner(customRules);
  const { markers, phases } = runner.runCollapseThenRecover();
  const recoveryMarkers = markers.slice(phases.recovery?.firstItem as number, phases.recovery?.lastItem as number + 1);
  const firstMarker = markers[0];
  const lastMarker = recoveryMarkers[recoveryMarkers.length - 1];
  const yearsToRecover = dayjs(lastMarker.endingDate).diff(dayjs(firstMarker.startingDate), 'years');

  expect(lastMarker.endingPrice).toBe(1.00);
  expect(yearsToRecover).toBe(60);
});

test("test regrowth", () => {
  const runner = new BlockchainRunner(rules);
  const { markers, phases } = runner.runCollapseThenRecover();
  const regrowthMarkers = markers.slice(phases.regrowth?.firstItem as number, phases.regrowth?.lastItem as number + 1);
  const lastMarker = regrowthMarkers[regrowthMarkers.length - 1];

  for (const [index, marker] of regrowthMarkers.entries()) {
    expect(marker.endingPrice).toBe(1.00);
  }

  expect(lastMarker.startingPrice).toBe(1.00);
  expect(lastMarker.endingPrice).toBe(1.00);
});

test("check for NaN fields", () => {
  const runner = new BlockchainRunner(rules);
  const { markers, phases } = runner.runCollapseThenRecover();

  for (const marker of markers) {
    expect(Number.isNaN(marker.startingVaultMeta.bitcoinCount)).toBe(false);
    expect(Number.isNaN(marker.startingVaultMeta.argonsMintedByBitcoins)).toBe(false);
    expect(Number.isNaN(marker.endingVaultMeta.bitcoinCount)).toBe(false);
    expect(Number.isNaN(marker.endingVaultMeta.argonsMintedByBitcoins)).toBe(false);
  }
});