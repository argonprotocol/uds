import { expect, test } from 'vitest';
import dayjs from 'dayjs';
import Vault from '../src/engine/Vault';
import { divide } from '../src/engine/Utils';
import rules from './helpers/rules';
import IRules from '../src/interfaces/IRules';

test("basic vault pricing", () => {
  const vault = new Vault(dayjs.utc('2022-05-09T00:00:00Z'));
  expect(vault.pricePerBtc).toBe(30_175.71);
});

test("basic vault", () => {
  const vault = new Vault();
  const vaultStartDate = dayjs.utc('2022-05-09T00:00:00Z');

  vault.setPricePerBtcOverride(10_000);
  vault.loadForDate(100_000, vaultStartDate, rules);

  expect(Object.values(vault.byDate).length).toBe(1);
  expect(vault.bitcoinCount).toBe(5);
  expect(vault.getTotalLockValue()).toBe(50_000);
  expect(vault.getTotalUnlockValue()).toBe(50_000);
});

test("expired bitcoins to unlock and be replaced", () => {
  const vault = new Vault();
  const vaultStartEnd = dayjs.utc('2022-05-09T00:00:00Z');

  vault.setPricePerBtcOverride(10_000);
  vault.loadForDate(100_000, vaultStartEnd.subtract(380, 'days'), rules);
  vault.loadForDate(300_000, vaultStartEnd.subtract(379, 'days'), rules);

  expect(Object.values(vault.byDate).length).toBe(2);
  expect(Object.values(vault.byDate)[0].ratchetedQty).toBe(5);
  expect(Object.values(vault.byDate)[1].ratchetedQty).toBe(10);
  expect(vault.getTotalLockValue()).toBe(150_000);

  vault.loadForDate(100_000, vaultStartEnd, rules);

  expect(Object.values(vault.byDate).length).toBe(1);
  expect(Object.values(vault.byDate)[0].ratchetedPrice * Object.values(vault.byDate)[0].ratchetedQty).toBe(50_000);
});

test("ratcheting down with no extra bitcoins", () => {
  const vault = new Vault();
  const firstVaultDate = dayjs.utc('2022-05-09T00:00:00Z');

  vault.setPricePerBtcOverride(10_000);
  vault.loadForDate(200_000, firstVaultDate, rules);
  
  expect(Object.values(vault.byDate).length).toBe(1);
  expect(vault.bitcoinCount).toBe(10);
  expect(vault.getTotalLockValue()).toBe(100_000);

  vault.setPricePerBtcOverride(5_000);
  vault.loadForDate(100_000, firstVaultDate.add(1, 'day'), rules);
  
  expect(Object.values(vault.byDate).length).toBe(1);
  expect(vault.bitcoinCount).toBe(10);
  expect(vault.getTotalLockValue()).toBe(50_000);
  expect(Object.values(vault.byDate)[0].pendingRatchetValue).toBe(0);
  expect(vault.profitsToDate).toBe(0);
});

test("ratcheting down with room for extra bitcoins", () => {
  const vault = new Vault();
  const vaultStartDate = dayjs.utc('2022-05-09T00:00:00Z');

  vault.setPricePerBtcOverride(10_000);
  vault.loadForDate(200_000, vaultStartDate, rules);

  expect(Object.values(vault.byDate).length).toBe(1);
  expect(vault.bitcoinCount).toBe(10);
  expect(vault.getTotalLockValue()).toBe(100_000);

  vault.setPricePerBtcOverride(20_000);
  vault.loadForDate(400_000, vaultStartDate.add(1, 'day'), rules);
  
  expect(Object.values(vault.byDate).length).toBe(2);
  expect(vault.bitcoinCount).toBe(12.5);
  expect(vault.getTotalLockValue()).toBe(200_000);

  vault.setPricePerBtcOverride(5_000);
  vault.loadForDate(400_000, vaultStartDate.add(2, 'day'), rules);

  expect(Object.values(vault.byDate).length).toBe(3);
  expect(vault.bitcoinCount).toBe(22.5);
  expect(vault.getTotalLockValue()).toBe(112_500);
  expect(Object.values(vault.byDate)[0].pendingRatchetValue).toBe(0);
  expect(vault.profitsToDate).toBe(50_000);
});

test("ratcheting up", () => {
  const vault = new Vault();
  const firstVaultDate = dayjs.utc('2022-03-11');

  vault.setPricePerBtcOverride(10_000);
  vault.loadForDate(100_000, firstVaultDate, rules);

  expect(Object.values(vault.byDate).length).toBe(1);
  expect(vault.bitcoinCount).toBe(5);
  expect(vault.getTotalLockValue()).toBe(50_000);
  expect(vault.argonsMintedByBitcoins).toBe(50_000);

  vault.setPricePerBtcOverride(20_000);
  vault.loadForDate(100_000, firstVaultDate.add(1, 'day'), rules);

  expect(Object.values(vault.byDate).length).toBe(1);
  expect(vault.bitcoinCount).toBe(5);
  expect(vault.getTotalLockValue()).toBe(50_000);
  expect(vault.argonsMintedByBitcoins).toBe(50_000);
  expect(Object.values(vault.byDate)[0].pendingRatchetValue).toBe(50_000);
  expect(vault.profitsToDate).toBe(0);

  vault.loadForDate(400_000, firstVaultDate.add(2, 'day'), rules);

  expect(Object.values(vault.byDate).length).toBe(2);
  expect(vault.bitcoinCount).toBe(12.5);
  expect(vault.getTotalLockValue()).toBe(200_000);
  expect(vault.argonsMintedByBitcoins).toBe(200_000);

  expect(Object.values(vault.byDate)[0].pendingRatchetValue).toBe(50_000);
  expect(vault.profitsToDate).toBe(0);
});

test("from terra launch to collapse", () => {
  const customRules: IRules = { ...rules, btcRatchetingPct: 20 };

  const startOnDate = dayjs.utc('2020-10-01T00:00:00Z');
  const endBeforeDate = dayjs.utc('2022-05-09T00:00:00Z');
  const lengthInDays = endBeforeDate.diff(startOnDate, 'days');
  
  const vault = new Vault();
  const circulationToAddPerDay = divide(rules.circulation, lengthInDays);
  
  let currentDate = startOnDate;
  let currentCirculation = 0;

  while (currentDate.isBefore(endBeforeDate)) {
    currentCirculation += circulationToAddPerDay;
    vault.loadForDate(currentCirculation, currentDate, customRules);
    currentDate = currentDate.add(1, 'day');
  }

  // console.log('--------------------------------');
  // console.log('totalUnlockValue', addCommas(vault.getTotalUnlockValue()));
  // console.log('totalLockValue', addCommas(vault.getTotalLockValue()));
  // console.log('profitsToDate', addCommas(vault.profitsToDate));
  // console.log('bitcoinCount', addCommas(vault.bitcoinCount));
  // console.log('argonsMintedByBitcoins', addCommas(vault.argonsMintedByBitcoins));

  expect(Object.values(vault.byDate).length).toBe(366);
  expect(Math.round(vault.bitcoinCount)).toBe(205_790);
  expect(Math.round(vault.getTotalLockValue())).toBe(8_785_806_267);
  expect(Math.round(vault.getTotalUnlockValue())).toBe(6_945_574_436);
  expect(Math.round(vault.profitsToDate)).toBe(530_277_777);
  expect(Math.round(vault.argonsMintedByBitcoins)).toBe(9_350_000_000);
});

test("vault from meta to unvault", () => {
  const vaultStartDate = dayjs.utc('2022-05-09T00:00:00Z').format('YYYY-MM-DD');
  const vault = Vault.fromJson({
    argonsMintedByBitcoins: 200_000,
    byDate: {
      [vaultStartDate]: {
        date: vaultStartDate,
        nonRatchetedQty: 0,
        nonRatchetedPrice: 20_000,
        ratchetedQty: 10,
        ratchetedPrice: 20_000,
        pendingRatchetValue: 0,
      },
    },
    ratchetMintingSpace: 0,
    currentDate: vaultStartDate,
    pricePerBtcOverride: 30_0000,
    profitsByDate: {},
  });

  expect(vault.bitcoinCount).toBe(10);
  expect(vault.getTotalLockValue()).toBe(200_000);
  expect(vault.profitsToDate).toBe(0);

  const argonsBurned1 = vault.burnCirculation(40_000, 1.00, 1);
  expect(argonsBurned1).toBe(20_000);
  expect(vault.profitsToDate).toBe(0);
  expect(vault.bitcoinCount).toBe(9);

  const argonsToBurn2 = vault.argonsNeededToUnlock(2, 0.5);
  const argonsBurned2 = vault.burnCirculation(argonsToBurn2, 0.5, 2);
  expect(argonsBurned2).toBe(54_024);
  expect(vault.profitsToDate).toBe(12_988);

  const argonsToBurn3 = vault.argonsNeededToUnlock(6, 0.001);
  const argonsBurned3 = vault.burnCirculation(argonsToBurn3, 0.001, 6);
  expect(argonsBurned3).toBe(48_069_120);
  expect(vault.profitsToDate).toBe(84_918.88);
  expect(vault.bitcoinCount).toBe(1);
});