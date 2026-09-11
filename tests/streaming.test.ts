import { expect, test } from 'vitest';
import BlockchainRunner from '../src/engine/BlockchainRunner';
import type { IMarkerJson } from '../src/engine/Marker';
import rules from '../src/lib/RulesConfig';
import { readFileSync } from 'node:fs';
import { createScenarioResult } from '../src/lib/ScenarioResult';

test('streamed recovery stops on the same day and returns identical markers', () => {
  const stalledRules = {
    ...rules, btcVaultCapacityPct: 0, enableTaxation: false,
    enableBitcoinVaulting: false, enableCertaintyGreed: false, enableSpeculativeGreed: false,
  };
  const expected = new BlockchainRunner(stalledRules).runCollapseThenRecover();
  for (const batchSize of [1, 5, 25]) {
    const markers: IMarkerJson[] = [];
    const runner = new BlockchainRunner(stalledRules, batchSize);
    runner.onMarkers = batch => markers.push(...batch);
    const result = runner.runCollapseThenRecover();
    markers.push(...result.markers);
    expect(result.phases).toEqual(expected.phases);
    expect(markers).toEqual(expected.markers);
  }
}, 120_000);

test('a streamed default run matches the generated versioned scenario', () => {
  const expected = JSON.parse(readFileSync(new URL('../public/data/collapseThenRecover.json', import.meta.url), 'utf8'));
  const markers: IMarkerJson[] = [];
  const runner = new BlockchainRunner(rules, 5);
  runner.onMarkers = batch => markers.push(...batch);
  const result = runner.runCollapseThenRecover();
  markers.push(...result.markers);
  const envelope = createScenarioResult('collapseThenRecover', rules, { markers, phases: result.phases });
  // JSON serialization intentionally omits optional undefined marker fields.
  expect(JSON.parse(JSON.stringify(envelope))).toEqual(expected);
}, 120_000);
