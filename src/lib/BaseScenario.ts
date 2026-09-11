import type IRules from '../interfaces/IRules';
import { readScenarioResult, type ScenarioId } from './ScenarioResult';

export default class BaseScenario {
  static async get(filter: ScenarioId, rules: IRules) {
    const response = await fetch(`/data/${filter}.json`, {
      headers: {
        'Content-Type': 'application/json' // Set the content type to JSON
      },
    });

    if (!response.ok) return null;
    const responseData = await response.json();
    return readScenarioResult(responseData, filter, rules);
  }
}
