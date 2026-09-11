import { expect, test } from 'vitest';
import { createScenarioResult, readScenarioResult, MODEL_VERSION, PROTOCOL_REFERENCE } from '../src/lib/ScenarioResult';
import rules from '../src/lib/RulesConfig';
import Marker from '../src/engine/Marker';
import dayjs from 'dayjs';

function sample() {
  return createScenarioResult('collapseThenRecover', rules, {
    markers: [new Marker(dayjs.utc('2022-01-01'), 24, 100, 100).toJson()],
    phases: { launch: { firstItem: 0, lastItem: 0 } },
  });
}

test('generated and cached results round-trip with exact rules and reference', () => {
  const result = sample();
  const serialized = JSON.stringify(result);
  const restored = readScenarioResult(serialized, 'collapseThenRecover', rules);
  expect(restored).toEqual(JSON.parse(serialized));
  expect(restored?.modelVersion).toBe(MODEL_VERSION);
  expect(restored?.protocolReference).toEqual(PROTOCOL_REFERENCE);
  expect(readScenarioResult(result, 'collapseThenRecover', rules)).toBe(result);
});

test('rule property order does not affect cache acceptance', () => {
  const reordered = Object.fromEntries(Object.entries(rules).reverse()) as typeof rules;
  expect(readScenarioResult(sample(), 'collapseThenRecover', reordered)).not.toBeNull();
});

test('changed, missing, or extra rules invalidate the result', () => {
  for (const changedRules of [
    { ...rules, btcVaultCapacityPct: 80 },
    { ...rules, dollarInflation: 2 },
    { ...rules, enableSpeculativeGreed: true },
    { ...rules, futureRule: 1 },
  ]) {
    expect(readScenarioResult(sample(), 'collapseThenRecover', changedRules)).toBeNull();
  }
  const result = sample();
  delete (result.rules as Partial<typeof rules>).btcPriceOverride;
  expect(readScenarioResult(result, 'collapseThenRecover', rules)).toBeNull();
});

test('version, protocol reference, and scenario must match', () => {
  const result = sample();
  expect(readScenarioResult({ ...result, modelVersion: MODEL_VERSION - 1 }, 'collapseThenRecover', rules)).toBeNull();
  expect(readScenarioResult({ ...result, protocolReference: { ...PROTOCOL_REFERENCE, sourceCommit: 'other' } }, 'collapseThenRecover', rules)).toBeNull();
  expect(readScenarioResult({ ...result, protocolReference: { ...PROTOCOL_REFERENCE, specVersion: 159 } }, 'collapseThenRecover', rules)).toBeNull();
  expect(readScenarioResult(result, 'collapsedForever', rules)).toBeNull();
});

test('unversioned, corrupt, and empty results are ignored', () => {
  const result = sample();
  for (const invalid of [
    null, undefined, '{broken', 'null',
    { markers: result.markers, phases: result.phases },
    { ...result, markers: [] },
    { ...result, phases: null },
  ]) {
    expect(readScenarioResult(invalid, 'collapseThenRecover', rules)).toBeNull();
  }
});

test('creating a result snapshots the rules', () => {
  const runRules = { ...rules };
  const result = createScenarioResult('collapseThenRecover', runRules, sample());
  runRules.btcVaultCapacityPct = 80;
  expect(result.rules.btcVaultCapacityPct).toBe(100);
});
