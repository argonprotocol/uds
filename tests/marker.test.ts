import { expect, test } from 'vitest';
import dayjs from 'dayjs';
import rules from './helpers/rules';
import Marker from '../src/engine/Marker';
import Vault, { IVaultToJson } from '../src/engine/Vault';
import { TERRA_RESERVE_FUND } from '../src/engine/BlockchainRunner';
import Reserve from '../src/engine/Reserve';
import vaultExportCreator from './helpers/vaultExportCreator';
import vaultExportAdvanced1 from './helpers/vaultExportAdvanced1';
import vaultExportAdvanced2 from './helpers/vaultExportAdvanced2';

test("test single day recovery", () => {
  const customRules = {
    ...rules,
    btcMaxTxnsPerHour: 1000,
  };
  const currentDate = dayjs.utc('2022-07-04');
  const durationInHours = 24;
  const currentCirculation = 10_000_000;
  const currentCapital = 5_000_000;
  
  const vaultExport: IVaultToJson = vaultExportCreator(currentDate, {
    bitcoinCount: 100_000,
    dollarsPerBitcoinLock: 10_000,
    dollarsPerBitcoinUnlock: 10_000,
    argonsBurnedPerBitcoinDollar: 1,
    argonBurnCapacity: 100_000_000,
    profitsToDate: 0,
    argonRatioPrice: 1.00,
    argonsMintedByBitcoins: 0,
  });

  const reserve = new Reserve(TERRA_RESERVE_FUND, TERRA_RESERVE_FUND);
  const vault = Vault.fromJson(vaultExport);
  vault.setPricePerBtcOverride(10_000);

  const marker = new Marker(currentDate, durationInHours, currentCirculation, currentCapital);

  marker.setAnnualTransactions(rules.maxTransactionsAnnually);
  marker.setAnnualMicropayments(rules.maxMicropaymentsAnnually);

  marker.runRecovery(rules, [], vault);
  marker.manageSeigniorageProfits(rules, reserve);

  expect(marker.startingPrice.toFixed(2)).toBe('0.50');
  expect(marker.currentPrice).toBe(1.00);
});

test("almost recovered while collapsing 1", () => {
  const currentDate = dayjs.utc('2022-06-11');
  const durationInHours = 24;
  const startingCirculation = 11334940.58600068;
  const startingCapital = 11334940.58600071;
  const vaultExport: IVaultToJson = vaultExportCreator(currentDate, {
    bitcoinCount: 176394.81949172003,
    dollarsPerBitcoinLock: 36702.5907271,
    dollarsPerBitcoinUnlock: 33123.6107271,
    argonsBurnedPerBitcoinDollar: 1,
    argonBurnCapacity: 6_000_000_000,
    profitsToDate: 0,
    argonRatioPrice: 1.00,
    argonsMintedByBitcoins: 0,
  });

  const reserve = new Reserve(TERRA_RESERVE_FUND, TERRA_RESERVE_FUND);
  const vault = Vault.fromJson(vaultExport);
  vault.setPricePerBtcOverride(rules.btcPriceOverride);

  const marker = new Marker(currentDate, durationInHours, startingCirculation, startingCapital);

  marker.setAnnualTransactions(rules.maxTransactionsAnnually);
  marker.setAnnualMicropayments(rules.maxMicropaymentsAnnually);

  marker.runRecovery(rules, [], vault);
  marker.manageSeigniorageProfits(rules, reserve);

  expect(marker.startingPrice).toBe(1.00);
  expect(marker.currentPrice).toBe(1.00);
});

test("almost recovered while collapsing 2", () => {
  const currentDate = dayjs.utc('2022-06-08');
  const durationInHours = 24;
  const startingCirculation = 152239587.0105677;
  const startingCapital = 152239587.0105667;
  const vaultExport: IVaultToJson = vaultExportCreator(currentDate, {
    bitcoinCount: 27742.39778409606,
    dollarsPerBitcoinLock: 36702.5907271,
    dollarsPerBitcoinUnlock: 33123.6107271,
    argonsBurnedPerBitcoinDollar: 1,
    argonBurnCapacity: 6_000_000_000,
    profitsToDate: 0,
    argonRatioPrice: 1.00,
    argonsMintedByBitcoins: 0,
  });

  const reserve = new Reserve(TERRA_RESERVE_FUND, TERRA_RESERVE_FUND);
  const vault = Vault.fromJson(vaultExport);
  vault.setPricePerBtcOverride(rules.btcPriceOverride);

  const marker = new Marker(currentDate, durationInHours, startingCirculation, startingCapital);

  marker.setAnnualTransactions(rules.maxTransactionsAnnually);
  marker.setAnnualMicropayments(rules.maxMicropaymentsAnnually);
  
  marker.removeCapital(86542271.37411, 'TerraCollapse');

  marker.runRecovery(rules, [], vault);
  marker.manageSeigniorageProfits(rules, reserve);

  expect(marker.startingPrice).toBe(1.00);
  expect(marker.currentPrice).toBe(1.00);
});

test("started recovering while collapsing", () => {
  const currentDate = dayjs.utc('2022-05-10');
  const durationInHours = 24;
  const startingCirculation = 17075324894.055326;
  const startingCapital = 14245274221.944801;
  const vaultExport: IVaultToJson = vaultExportCreator(currentDate, {
    bitcoinCount: 230314.93823991003,
    dollarsPerBitcoinLock: 36702.5907271,
    dollarsPerBitcoinUnlock: 33123.6107271,
    argonsBurnedPerBitcoinDollar: 1.03455384337,
    argonBurnCapacity: 6_000_000_000,
    profitsToDate: 0,
    argonRatioPrice: 1.00,
    argonsMintedByBitcoins: 0,
  });
  const previousMarkers = [
    { durationInHours: 24, currentCapital: 14245274221.944801, pctIncreaseFromTaxationCompoundedAnnually: 6.319735450124361e+21 } as Marker
  ];
  
  const reserve = new Reserve(TERRA_RESERVE_FUND, TERRA_RESERVE_FUND);
  const vault = Vault.fromJson(vaultExport);
  vault.setPricePerBtcOverride(rules.btcPriceOverride);

  const marker = new Marker(currentDate, durationInHours, startingCirculation, startingCapital);

  marker.setAnnualTransactions(rules.maxTransactionsAnnually);
  marker.setAnnualMicropayments(rules.maxMicropaymentsAnnually);
  
  marker.removeCapital(529640323.298, 'TerraCollapse');

  marker.runRecovery(rules, previousMarkers, vault);
  marker.manageSeigniorageProfits(rules, reserve);

  expect(marker.startingPrice).toBe(0.834260800912);
  expect(marker.currentPrice).toBe(1.00);
});

test("recovery using vaultExportAdvanced1", () => {
  const durationInHours = 24;
  const reserve = new Reserve(TERRA_RESERVE_FUND, TERRA_RESERVE_FUND);
  const vault = Vault.fromJson(vaultExportAdvanced1);
  const markers: Marker[] = [];

  let currentDate = dayjs.utc('2022-06-30T00:00:00.000Z');
  let currentCirculation = 11_334_940_586;
  let currentCapital = 11_334_941;  
  
  for (let i = 0; i < 4; i++) {
    const marker = new Marker(currentDate, durationInHours, currentCirculation, currentCapital);

    marker.setAnnualTransactions(rules.maxTransactionsAnnually);
    marker.setAnnualMicropayments(rules.maxMicropaymentsAnnually);
  
    marker.setReserve(reserve);
    marker.runRecovery(rules, [], vault);
    marker.manageSeigniorageProfits(rules, reserve);
    marker.runDisabledMechanisms(rules, false);

    markers.push(marker);

    currentDate = marker.nextDate;
    currentCirculation = marker.currentCirculation;
    currentCapital = marker.currentCapital;
  }

  const lastMarker = markers[markers.length - 1];

  expect(lastMarker.currentPrice).toBe(1.00);
  expect(vault.argonsMintedByBitcoins >= 0).toBe(true);
});

test("recovery using vaultExportAdvanced2", () => {
  const durationInHours = 24;
  const reserve = new Reserve(TERRA_RESERVE_FUND, TERRA_RESERVE_FUND);
  const vault = Vault.fromJson(vaultExportAdvanced2);
  const markers: Marker[] = [];

  let currentDate = dayjs.utc('2022-07-19T00:00:00.000Z');
  let currentCirculation =  15_971_986.454455547;
  let currentCapital = 11_334_941;  
  
  for (let i = 0; i < 2; i++) {
    const marker = new Marker(currentDate, durationInHours, currentCirculation, currentCapital);

    marker.setAnnualTransactions(rules.maxTransactionsAnnually);
    marker.setAnnualMicropayments(rules.maxMicropaymentsAnnually);
  
    marker.setReserve(reserve);
    marker.runRecovery(rules, [], vault);
    marker.manageSeigniorageProfits(rules, reserve);
    marker.runDisabledMechanisms(rules, false);

    markers.push(marker);

    currentDate = marker.nextDate;
    currentCirculation = marker.currentCirculation;
    currentCapital = marker.currentCapital;
  }

  const lastMarker = markers[markers.length - 1];

  expect(lastMarker.currentPrice).toBe(1.00);
});

