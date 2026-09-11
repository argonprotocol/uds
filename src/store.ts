import * as Vue from 'vue';
import { defineStore } from 'pinia'
import baseRules, { IRules } from './lib/RulesConfig';
import Engine from './lib/Engine';
import { IMarkerJson } from './engine/Marker';

export type IPanelName = 'tour' | 'runner' | 'base';
export type IFilterName = 'collapseThenRecover' | 'collapsedForever' | 'collapsingRecovery';

const config = JSON.parse(sessionStorage.getItem('config') || '{}');
const storedRules = JSON.parse(sessionStorage.getItem('rules') || 'null');
const initialRules = storedRules || baseRules;

export const useBasicStore = defineStore('help', () => {
  const isLoading: Vue.Ref<boolean> = Vue.ref(true);
  const isRunning: Vue.Ref<boolean> = Vue.ref(config.isRunning || false);
  const isReady: Vue.ComputedRef<boolean> = Vue.computed(() => !isLoading.value && !isRunning.value);

  const needsRerun: Vue.Ref<boolean> = Vue.ref(false);

  const tourStep: Vue.Ref<number> = Vue.ref(config.tourStep || 0);
  const completedWelcome: Vue.Ref<boolean> = Vue.ref(config.completedWelcome || false);

  const selectedFilter: Vue.Ref<IFilterName> = Vue.ref(config.selectedFilter || 'collapseThenRecover');
  const rules: Vue.Ref<IRules> = Vue.ref({ ...initialRules });

  const incomingMarkers: Vue.Ref<IMarkerJson[]> = Vue.ref([]);
  const simulationData: Vue.Ref<{ markers: IMarkerJson[], phases: any }> = Vue.ref({ markers: [], phases: {} });
  const dollarMarkers: Vue.Ref<any[]> = Vue.ref([]);

  const engine = new Engine(isRunning, initialRules, selectedFilter, simulationData, incomingMarkers, dollarMarkers);

  function setConfig(data: any) {
    tourStep.value = data.tourStep ?? tourStep.value;
    completedWelcome.value = data.completedWelcome ?? completedWelcome.value;
    selectedFilter.value = data.selectedFilter ?? selectedFilter.value;
    
    sessionStorage.setItem('config', JSON.stringify({
      tourStep: tourStep.value,
      completedWelcome: completedWelcome.value,
      selectedFilter: selectedFilter.value
    }));
  }

  async function resetConfig() {
    sessionStorage.removeItem('config');
    sessionStorage.removeItem('rules');
    await engine.reset();
  }

  async function rerunEngine() {
    const stringifiedRules = JSON.stringify(rules.value);
    sessionStorage.setItem('rules', stringifiedRules);
    engine.rules = JSON.parse(stringifiedRules);
    await engine.reset();
    engine.run(selectedFilter.value);
  }
  
  Vue.watch(rules, () => {
    needsRerun.value = true;
  }, { deep: true });

  Vue.watch(() => selectedFilter.value, async () => {
    isLoading.value = true;
    await engine.setFilter(selectedFilter.value);
    isLoading.value = false;
  });

  async function load() {
    await engine.start(selectedFilter.value);  
    isLoading.value = false;
  }

  return {
    isLoading,
    isRunning,
    isReady,
    tourStep,
    completedWelcome,
    selectedFilter, 
    rules,
    simulationData,
    dollarMarkers,
    needsRerun,
    incomingMarkers,
    load,
    setConfig,
    resetConfig,
    rerunEngine
  }
});
