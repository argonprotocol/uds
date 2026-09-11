<template>
  <div ref="componentElement" class="MainPanel Component relative pt-2 -mt-2 h-full flex flex-col overflow-hidden">
    <div class="h-full flex flex-col relative">
      
      <div class="absolute w-full h-full flex flex-col pointer-events-none">        
        <div ChartCallout class="absolute bottom-[47%] left-[25px] z-1 h-[10%]">
          <div class="absolute top-12 bottom-0 left-0 w-[1px] bg-slate-400"></div>
          <p class="CalloutText relative left-0 -top-1">
            Argon follows the same trajectory<br />
            as Terra, growing to $18.7B in demand.
          </p>
        </div>

        <div v-if="chartIsStandardLength" ChartCallout class="absolute bottom-[47%] left-[18.5%] z-1 h-[28%]">
          <div class="absolute top-10 bottom-0 right-0 w-[1px] bg-slate-400"></div>
          <div class="absolute top-10 right-0 h-[1px] w-32 bg-slate-400"></div>
          <p class="CalloutText relative right-36 text-right">
            Argon is hit with a full<br />
            Terra-like collapse as $18.69B<br />
            in capital flees the asset.
          </p>
        </div>

        <div v-if="chartIsStandardLength && selectedFilter === 'collapseThenRecover'" ChartCallout class="absolute bottom-[47%] left-[34.1%] z-1 h-[18%]">
          <div class="absolute top-6 bottom-0 -left-1 w-[1px] bg-slate-400"></div>
          <div class="absolute top-6 -left-1 h-[1px] w-10 bg-slate-400"></div>
          <p class="CalloutText relative left-12 text-left">
            Argon bounces back to its target<br />
            price in under 3 days, creating an<br /> 
            enormous profit for those who participated.
          </p>
        </div>
        <!-- <div v-else-if="selectedFilter === 'collapsingRecovery'" ChartCallout class="absolute bottom-[47%] left-[34.1%] z-1 h-[18%]">
          <div class="absolute top-6 bottom-0 -left-1 w-[1px] bg-slate-400"></div>
          <div class="absolute top-6 -left-1 h-[1px] w-10 bg-slate-400"></div>
          <p class="CalloutText relative left-12 text-left">
            Argon has absorbed the full brunt of Terra's<br />
            $18.69B collapse, and other than brief dips<br />
            in price, remains incredibly stable.
          </p>
        </div> -->

        <div v-else-if="chartIsStandardLength && selectedFilter === 'collapsedForever'" ChartCallout class="absolute bottom-[9.5%] left-[37.5%] z-1 h-[20%]">
          <div class="absolute pointer-events-auto top-[70px] bottom-0 -left-8 w-[1px] bg-slate-400 rotate-[30deg]"></div>
          <p class="CalloutText pointer-events-auto right-0 -top-1 text-left">
            Argon's novel stabilization mechanisms are<br />
            disabled, meaning it basically resembles.<br />
            Terra with no hope of recovering.
          </p>
        </div>
      </div>
      
      <div class="grow relative">
        <ChartBg />
        <Chart ref="chartRef" :xAxisPhases="xAxisPhases" :endingYear="chartEndingYear" />
        <div class="absolute top-1/2 translate-y-[222%] left-14 bg-[var(--sam-background)] px-1 z-[10] pointer-events-none text-[#63298E] text-sm font-light">1.00</div>
        <div v-if="needsRerun" class="absolute top-0 left-0 w-full h-full z-10">
          <div class="absolute top-0 left-0 w-full h-full bg-[var(--sam-background)] opacity-80">
            <ChartBg />
          </div>
          <div @click="rerunEngine" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 group rounded-full bg-[var(--sam-surface)] border border-slate-400/40 shadow-md flex items-center justify-center cursor-pointer">
            <RerunIcon class="w-28 h-28 relative top-0.5 opacity-60 group-hover:opacity-100" />
            <span class="absolute top-[51%] left-[52%] -translate-x-1/2 -translate-y-1/2 text-slate-700/50 group-hover:text-slate-700/70 text-sm font-bold text-shadow">RERUN</span>
          </div>
        </div>
      </div>
    
      <div class="absolute right-20 top-[8%] flex flex-col pb-20 items-end">
        <div class="relative max-w-[41%]">
          <p class="relative text-slate-700/80 text-base font-light text-shadow text-right z-[10]">
            <strong class="font-bold">What Is SAM?</strong> This Stabilization Analysis Model (SAM) is a simulator that forces Argon into a death-spiral using Terra's collapse 
            as its blueprint. Terra is one of the largest cypto failures in history, losing $18.7 billion in days. No stablecoin has shown an ability to survive such a 
            death-sprial, which makes Terra the ideal scenario to test Argon.
          </p>

          <div ref="configSectionRef" class="absolute top-full translate-y-7 right-0 z-[10]">            
          
            <section class="divide-y divide-slate-400/40 border-b border-slate-400/40 whitespace-nowrap uppercase text-sm text-right cursor-default">
              <h3 class="pt-1 pb-2 font-semibold text-base">CONFIGURE BASIC PROPERTIES</h3>
              <div class="relative py-2 pl-3">
                LIQUID LOCKING OF BITCOIN IS AT
                <EditorButton id="btcVaultCapacityPct" type="percent" v-model="rules.btcVaultCapacityPct" />
                CAPACITY
              </div>
              <div class="relative py-2 pl-3">
                A MAX OF
                <EditorButton id="btcMaxTxnsPerHour" type="number" v-model="rules.btcMaxTxnsPerHour" />
                BITCOINS CAN UNLOCK PER HOUR
              </div>
            </section>

            <div class="absolute -bottom-5 right-0 flex flex-row space-x-4 whitespace-nowrap translate-y-full justify-end">
              <span VideoLink @click="openVideoOverlay" class="text-fuchsia-600 hover:text-fuchsia-500 cursor-pointer flex flex-row items-center pl-1 font-bold">
                <PlayOutlined OutlineIcon class="w-6 h-6 inline-block" />
                <PlaySolid SolidIcon class="w-6 h-6 inline-block" />
                <span class="inline-block underline decoration-dashed decoration-fuchsia-300 underline-offset-4 ml-2">
                  Watch <em class="italic">Intro to SAM 101</em>
                </span>
              </span>
              <button @click="openConfiguration" class="border border-slate-400 text-fuchsia-700 py-1.5 px-6 rounded-md bg-white/50 hover:bg-white/100">
                Edit All Properties
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
    <PlayerOverlay />
    <ConfigurationOverlay />
  </div>
</template>

<script setup lang="ts">
import * as Vue from 'vue';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { IFilterName, useBasicStore } from '../store';
import Chart from '../components/Chart.vue';
import PlayerOverlay from '../overlays/PlayerOverlay.vue';
import ConfigurationOverlay from '../overlays/ConfigurationOverlay.vue';
import { storeToRefs } from 'pinia';
import emitter from '../emitters/basic';
import ChartBg from '../components/ChartBg.vue';
import EditorButton from '../components/EditorButton.vue';
import PlayOutlined from '../assets/play-outlined.svg';
import PlaySolid from '../assets/play-solid.svg';
import RerunIcon from '../assets/rerun.svg';

dayjs.extend(utc);

const basicStore = useBasicStore();
const { selectedFilter, rules, simulationData, dollarMarkers, needsRerun } = storeToRefs(basicStore);

const chartRef = Vue.ref<typeof Chart | null>(null);
const chartIsStandardLength = Vue.ref(true);
const chartEndingYear = Vue.ref(2025);

const componentElement = Vue.ref(null);

function rerunEngine() {
  needsRerun.value = false;
  basicStore.rerunEngine();
}

function openVideoOverlay() {
  emitter.emit('openVideoOverlay');
}

function openConfiguration() {
  emitter.emit('openEditing');
}

function loadData() {
  const markers = simulationData.value.markers;
  const phases: any = {};

  for (const [name, phase] of Object.entries(simulationData.value.phases) as any) {
    phases[name] = {
      firstItem: markers[phase.firstItem],
      lastItem: markers[phase.lastItem],
    }
  }

  xAxisUpdate(selectedFilter.value, phases);

  let accumulatedSeigniorage = 0;
  let accumulatedArgonLoss = 0;

  // connect each item to the next and previous item
  for (const [index, item] of markers.entries()) {
    const seigniorageProfits: number[] = Object.values(item.seigniorageMap as any);
    const addedSeigniorageProfits = seigniorageProfits.reduce((acc: number, curr: number) => acc + curr, 0);

    accumulatedSeigniorage += addedSeigniorageProfits;
    accumulatedArgonLoss += item.argonLossDueToFear;
    item.seigniorageProfits = accumulatedSeigniorage;
    item.argonLossDueToFear = accumulatedArgonLoss;

    item.nextIdx = (markers[index + 1] || item).idx;
    item.previousIdx = (markers[index - 1] || item).idx;
    item.dollar = dollarMarkers.value[index];
  }
  
  chartEndingYear.value = dayjs.utc(markers[markers.length - 1].endingDate).year();
  chartIsStandardLength.value = chartEndingYear.value === 2025;
  chartRef.value?.reloadData(markers, dollarMarkers.value);

  setStartingSelectorPos(phases);
  setTimeout(() => setStartingSelectorPos(phases), 1);
}

function setStartingSelectorPos(phases: any) {
  const startPhase = phases.collapse || phases.collapsingRecovery;
  const endPhase = phases.recovery || phases.collapse || phases.collapsingRecovery;
 chartRef.value?.setMainSelectorPos(startPhase.firstItem.idx, endPhase.lastItem.idx);
}

const xAxisLaunchPhase = {
  id: 'launch',
  label: "Replication of Terra's Launch",
  bgColor: '#AAB0B7',
  firstItem: {
    startingDate: '2020-10-01',
  },
  lastItem: {
    startingDate: '2022-05-08',
  },
};

const xAxisPhases: Vue.Ref<any[]> = Vue.ref([xAxisLaunchPhase]);

function xAxisUpdate(newSelectedFilter: IFilterName, phases: any) {
  xAxisPhases.value = [{ 
    ...xAxisLaunchPhase, 
    ...phases.launch,
  }];
   
  if (newSelectedFilter === 'collapseThenRecover') {
    xAxisPhases.value.push(...[
      {
        id: 'collapse',
        bgColor: '#F36F6F',
        ...phases.collapse,
      }, {
        id: 'recovery',
        bgColor: ['#F36F6F', '#93CD61'],
        ...phases.recovery,
      }, {
        id: 'regrowth',
        label: 'Stabilized and Growing',
        bgColor: '#93CD61',
        ...phases.regrowth,
      }
    ]);
  } else if (newSelectedFilter === 'collapsingRecovery') {
    xAxisPhases.value.push(...[
      {
        id: 'collapsingRecovery',
        bgColor: ['#F36F6F', '#93CD61'],
        ...phases.collapsingRecovery,
      }, {
        id: 'regrowth',
        label: 'Stabilized and Growing',
        bgColor: '#93CD61',
        ...phases.regrowth,
      }
    ]);
  } else if (newSelectedFilter === 'collapsedForever') {
    xAxisPhases.value.push(...[
      {
        id: 'collapse',
        bgColor: '#F36F6F',
        ...phases.collapse,
      }, {
        id: 'collapsedForever',
        label: 'No Hope of Recovery',
        bgColor: '#F36F6F',
        ...phases.collapsedForever,
      }
    ]);
  }
}

Vue.onMounted(() => loadData());
</script>

<style lang="scss">
.MainPanel.Component {  
  .CalloutText {
    @apply font-light text-slate-400 select-none;
    text-shadow: 1px 1px 0 rgba(255, 255, 255, 0.5);
    &:hover {
      @apply text-slate-500;
    }
  }

  [VideoLink] {
    [SolidIcon] {
      display: none;
    }
    [OutlineIcon] {
      display: inline-block;
    }
    &:hover {
      [SolidIcon] {
        display: inline-block;
      }
      [OutlineIcon] {
        display: none;
      }
    }
    svg path {
      fill: rgb(192 38 211) !important;
    }
  }
}
</style>