import type IRules from '../interfaces/IRules';
import type BlockchainRunner from '../engine/BlockchainRunner';

// Bump whenever engine behavior or an input dataset changes.
export const MODEL_VERSION = 1;
// Comparison baseline, not a claim that SAM implements the entire runtime.
export const PROTOCOL_REFERENCE = {
  specVersion: 158,
  release: 'v1.4.12',
  sourceCommit: 'f79ac75ee9f0da8a8177d772379897e194b70ff2',
} as const;

export const SCENARIO_IDS = ['collapseThenRecover', 'collapsedForever', 'collapsingRecovery'] as const;
export type ScenarioId = typeof SCENARIO_IDS[number];
export type ScenarioData = ReturnType<BlockchainRunner['runCollapseThenRecover']>;
export interface ScenarioResult extends ScenarioData {
  modelVersion: number;
  protocolReference: typeof PROTOCOL_REFERENCE;
  rules: IRules;
  scenarioId: ScenarioId;
}

export function createScenarioResult(scenarioId: ScenarioId, rules: IRules, data: ScenarioData): ScenarioResult {
  return {
    modelVersion: MODEL_VERSION,
    protocolReference: { ...PROTOCOL_REFERENCE },
    rules: { ...rules },
    scenarioId,
    markers: data.markers,
    phases: data.phases,
  };
}

// Rules are a flat object. Compare values, not object property order or a hash.
export function readScenarioResult(value: unknown, scenarioId: ScenarioId, rules: IRules): ScenarioResult | null {
  try {
    const result = typeof value === 'string' ? JSON.parse(value) : value;
    if (!result || result.modelVersion !== MODEL_VERSION || result.scenarioId !== scenarioId) return null;
    if (!Object.entries(PROTOCOL_REFERENCE).every(([key, expected]) => result.protocolReference?.[key] === expected)) return null;
    if (!result.rules || Object.keys(result.rules).length !== Object.keys(rules).length) return null;
    if (!Object.entries(rules).every(([key, expected]) => result.rules[key] === expected)) return null;
    if (!Array.isArray(result.markers) || result.markers.length === 0 || !result.phases || typeof result.phases !== 'object') return null;
    return result as ScenarioResult;
  } catch {
    return null;
  }
}
