import * as Vue from 'vue';
import { defineStore } from 'pinia'
import baseRules, { IRules } from './lib/RulesConfig';
import { IMarkerJson } from './engine/Marker';

export type IPanelName = 'tour' | 'runner' | 'base';
export type IFilterName = 'collapseThenRecover' | 'collapsedForever' | 'collapsingRecovery';

const config = JSON.parse(sessionStorage.getItem('config') || '{}');
const storedRules = JSON.parse(sessionStorage.getItem('rules') || 'null');
const initialRules = {
  ...baseRules,
  ...storedRules,
  // A refreshed snapshot applies on page load, including existing sessions.
  usdTargetForArgon: baseRules.usdTargetForArgon,
  targetUpdatedAt: baseRules.targetUpdatedAt,
};

export const useBasicStore = defineStore('help', () => {
  const isLoading: Vue.Ref<boolean> = Vue.ref(true);
  const isRunning: Vue.Ref<boolean> = Vue.ref(false);
  const isReady: Vue.ComputedRef<boolean> = Vue.computed(() => !isLoading.value && !isRunning.value);

  const needsRerun: Vue.Ref<boolean> = Vue.ref(false);

  const tourStep: Vue.Ref<number> = Vue.ref(config.tourStep || 0);
  const completedWelcome: Vue.Ref<boolean> = Vue.ref(config.completedWelcome || false);

  const selectedFilter: Vue.Ref<IFilterName> = Vue.ref('collapseThenRecover');
  const rules: Vue.Ref<IRules> = Vue.ref({ ...initialRules });

  const incomingMarkers: Vue.Ref<IMarkerJson[]> = Vue.ref([]);
  const simulationData: Vue.Ref<{ markers: IMarkerJson[], phases: any }> = Vue.ref({ markers: [], phases: {} });
  const dollarMarkers: Vue.Ref<any[]> = Vue.ref([]);


  function setConfig(data: any) {
    tourStep.value = data.tourStep ?? tourStep.value;
    completedWelcome.value = data.completedWelcome ?? completedWelcome.value;
    
    sessionStorage.setItem('config', JSON.stringify({
      tourStep: tourStep.value,
      completedWelcome: completedWelcome.value
    }));
  }

  async function resetConfig() {
    sessionStorage.removeItem('config');
    sessionStorage.removeItem('rules');
    rules.value = { ...baseRules };
    needsRerun.value = false;
  }

  // Retained for existing UI consumers during the incremental overhaul.
  // Editing rules only persists configuration; it does not launch a scenario.
  async function rerunEngine() {
    sessionStorage.setItem('rules', JSON.stringify(rules.value));
    needsRerun.value = false;
  }

  Vue.watch(rules, () => {
    sessionStorage.setItem('rules', JSON.stringify(rules.value));
  }, { deep: true });

  async function load() {
    isRunning.value = false;
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
