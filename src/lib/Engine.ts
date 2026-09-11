import * as Vue from 'vue';
import { get as getFromIdb, set as setToIdb, del as delFromIdb } from 'idb-keyval';
import EngineWorker from '../workers/engine.ts?worker';
import BaseScenario from './BaseScenario';
import DollarInflation from '../engine/DollarInflation';
import type { IFilterName } from '../store';
import type { IMarkerJson } from '../engine/Marker';
import type IRules from '../interfaces/IRules';
import { createScenarioResult, readScenarioResult, SCENARIO_IDS, type ScenarioData } from './ScenarioResult';

let isStarted = false;

export default class Engine {
  public workerResponse: ScenarioData = { markers: [], phases: {} };

  private worker: Worker;
  private runningFilter: IFilterName | null = null;
  private runningRules: IRules;
  private generation = 0;
  private pendingSave: Promise<void> = Promise.resolve();

  constructor(
    public isRunning: Vue.Ref<boolean>,
    public rules: IRules,
    public selectedFilter: Vue.Ref<IFilterName>,
    public simulationData: Vue.Ref<ScenarioData>,
    public incomingMarkers: Vue.Ref<IMarkerJson[]>,
    public dollarMarkers: Vue.Ref<any[]>,
  ) {
    if (isStarted) throw new Error('Cannot create more than one Engine instance');
    isStarted = true;
    this.runningRules = { ...rules };
    this.worker = this.createWorker();
  }

  private createWorker() {
    const worker = new EngineWorker();
    worker.onmessage = event => {
      if (worker === this.worker) {
        this.handleWorkerMessage(event).catch(console.error);
      }
    };
    return worker;
  }

  public async start(filterName: IFilterName) {
    await this.setFilter(filterName);
  }

  public run(filterName: IFilterName) {
    if (!filterName) throw new Error('filterName is required');
    // A background scenario may still be finishing. runNext prioritizes the
    // selected filter afterwards, without mixing two runs in workerResponse.
    if (this.runningFilter) return;
    this.runningFilter = filterName;
    this.runningRules = { ...this.rules };
    if (filterName === this.selectedFilter.value) {
      this.isRunning.value = true;
    }
    this.incomingMarkers.value = [];
    this.workerResponse = { markers: [], phases: {} };
    this.worker.postMessage({ rules: this.runningRules, emitEvery: 5, filterName });
  }

  public async reset() {
    this.generation++;
    this.worker.terminate();
    this.worker = this.createWorker();
    this.runningFilter = null;
    this.isRunning.value = false;
    this.simulationData.value = { markers: [], phases: {} };
    this.dollarMarkers.value = [];
    this.incomingMarkers.value = [];
    // An in-flight completed run must finish saving before its cache is deleted.
    await this.pendingSave;
    await Promise.all([
      ...SCENARIO_IDS.map(id => delFromIdb(`engineData-${id}`)),
      delFromIdb('engineIsInActiveMode'),
    ]);
  }

  public async setFilter(filterName: IFilterName) {
    const generation = this.generation;
    const rules = { ...this.rules };
    const storedData = readScenarioResult(await getFromIdb(`engineData-${filterName}`), filterName, rules);
    const data = storedData ?? await BaseScenario.get(filterName, rules);
    if (generation !== this.generation || filterName !== this.selectedFilter.value) return;

    if (data) {
      this.simulationData.value = data;
      this.generateDollarMarkers();
      this.isRunning.value = false;
    } else {
      this.isRunning.value = true;
      this.run(filterName);
    }
  }

  private async runNext() {
    const generation = this.generation;
    const filters = [...new Set([this.selectedFilter.value, ...SCENARIO_IDS])];
    for (const filterName of filters) {
      const result = readScenarioResult(await getFromIdb(`engineData-${filterName}`), filterName, this.rules);
      if (generation !== this.generation) return;
      if (!result) {
        this.run(filterName);
        return;
      }
    }
  }

  private generateDollarMarkers() {
    const markers = this.simulationData.value.markers;
    const dollarInflation = new DollarInflation(this.rules);
    this.dollarMarkers.value = dollarInflation.generateMarkersForRange(markers[0].startingDate, markers[markers.length - 1].endingDate);
  }

  private async handleWorkerMessage(event: MessageEvent) {
    const generation = this.generation;
    if (this.selectedFilter.value === this.runningFilter) {
      this.incomingMarkers.value.push(...event.data.markers);
    }
    this.workerResponse.markers.push(...event.data.markers);

    if (event.data.isFinished) {
      this.workerResponse.phases = event.data.phases;
      const result = createScenarioResult(event.data.filterName, this.runningRules, this.workerResponse);
      this.pendingSave = setToIdb(`engineData-${result.scenarioId}`, JSON.stringify(result));
      await this.pendingSave;
      if (generation !== this.generation) return;
      this.runningFilter = null;

      if (this.selectedFilter.value === result.scenarioId) {
        this.simulationData.value = result;
        this.generateDollarMarkers();
        this.isRunning.value = false;
      }
      await this.runNext();
    }
  }
}
