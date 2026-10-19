<template>
  <div ref="componentElement" class="MainPanel Component relative pt-2 -mt-2 h-full flex flex-col overflow-hidden">
    <div class="h-full flex flex-col relative">
      
      <div class="grow relative">
        <ChartBg />
        <Chart ref="chartRef" :xAxisPhases="[]" :startingTime="chartStartingTime" :endingTime="chartEndingTime" :hideTooltip="true" :recoveryPoints="recoveryPoints" :recoveryCursor="recoveryCursor" :recoveryPlaying="recoveryPlaying" :recoverySample="recoverySample"
          :guidanceState="guidanceState" :guidanceFrame="recoverySample ?? recoveryFrames[0]" :guidanceRequest="recoveryRequest" :guidanceHistory="guidanceHistory" :recoveryFrames="recoveryFrames" :reserveStall="reserveStall" :allowTargetExtension="guidanceState === 'done'"
          @guidanceStart="startPending" @guidanceContinue="resumePlayback" @guidanceDone="guidanceState = 'done'"
          @priceChanged="onPriceChanged" @dragFadeChanged="dragFadeProgress = $event" @targetPositionChanged="targetLineY = $event" @recoveryRequested="prepareSimulation" @mintingRequested="prepareSimulation" @recoveryCancelled="cancelRecovery" />
        <RecoveryPlayback v-if="recoveryRequest || dragFadeProgress > 0"
          :key="recoveryRequest ? recoveryRunId : 'preview'" class="RecoveryPanel" :style="statsLayout"
          :frames="recoveryRequest ? recoveryFrames : previewFrames" :result="recoveryResult" :error="recoveryError"
          :preview="!recoveryRequest || guidanceState === 'ready'" :btc-price="rules.btcPriceOverride"
          :target="rules.usdTargetForArgon" :paused="['explaining', 'reserve-stall', 'selloff-bottom', 'speculative-demand'].includes(guidanceState)"
          :reserveWaitDays="recoveryRequest?.rules.fearSelloffDelayInDays"
          :explanationPauseHours="getExplanationPauseHours" @explanationPause="pauseForExplanation" @reservePause="pauseForReserve" @bottomPause="pauseAtBottom" @speculativePause="pauseForSpeculation" @sample="onRecoverySample" />

      </div>
    
      <button v-if="false" type="button" VideoLink @click="openVideoOverlay" class="absolute bottom-14 right-6 z-20 text-fuchsia-600 hover:text-fuchsia-500 flex items-center font-bold bg-white/50 px-2 py-1">
        <PlayOutlined OutlineIcon class="w-6 h-6" />
        <PlaySolid SolidIcon class="w-6 h-6" />
        <span class="underline decoration-dashed decoration-fuchsia-300 underline-offset-4 ml-2">Watch <em class="italic">Intro to Restabilization</em></span>
      </button>

    </div>
    <PlayerOverlay />
  </div>
</template>

<script setup lang="ts">
import * as Vue from 'vue';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import RecoveryWorker from '../workers/recovery.ts?worker';
import type { RecoveryRequest, RecoveryResult, RecoveryFrame } from '../lib/RecoveryRunner';
import MiningEngine from '../engine/MiningEngine';
import { useBasicStore } from '../store';
import Chart from '../components/Chart.vue';
import RecoveryPlayback from '../components/RecoveryPlayback.vue';
import PlayerOverlay from '../overlays/PlayerOverlay.vue';
import { storeToRefs } from 'pinia';
import emitter from '../emitters/basic';
import ChartBg from '../components/ChartBg.vue';
import PlayOutlined from '../assets/play-outlined.svg';
import PlaySolid from '../assets/play-solid.svg';


const basicStore = useBasicStore();
const { rules } = storeToRefs(basicStore);
const props = defineProps<{ lockedBitcoins: number }>();
const emit = defineEmits<{
  priceChanged: [price: number];
  recoveryAmountsChanged: [amounts: { circulation: number; lockedBitcoins: number } | null];
}>();
const bitcoinsInLiquidLocks = Vue.computed(() => props.lockedBitcoins);
const displayPrice = Vue.ref(rules.value.usdTargetForArgon);
const targetLineY = Vue.ref(0);
const dragFadeProgress = Vue.ref(0);
function onPriceChanged(price: number) {
  displayPrice.value = price;
  emit('priceChanged', price);
}
const previewFrames = Vue.computed<RecoveryFrame[]>(() => [{
  time: chartStartingTime, elapsedHours: 0, price: displayPrice.value,
  circulation: rules.value.circulation, bitcoinsRemaining: props.lockedBitcoins,
  argonsBurned: 0, bitcoinsUnlocked: 0,
}]);
const statsLayout = Vue.computed(() => {
  const aboveTarget = (recoveryRequest.value?.startingPrice ?? displayPrice.value) > rules.value.usdTargetForArgon;
  return { opacity: recoveryRequest.value ? 1 : dragFadeProgress.value, top: `${targetLineY.value + (aboveTarget ? 65 : -65)}px`, transform: aboveTarget ? 'none' : 'translateY(-100%)' };
});

dayjs.extend(utc);

// Anchor the window to the user's current calendar date, with UTC chart coordinates.
const today = dayjs().startOf('day');
const toChartTime = (date: dayjs.Dayjs) => Date.UTC(date.year(), date.month(), date.date());
const chartStartingTime = toChartTime(today.subtract(7, 'day'));
const chartEndingTime = toChartTime(today.add(23, 'day'));

const chartRef = Vue.ref<typeof Chart | null>(null);
const componentElement = Vue.ref(null);
const recoveryPoints = Vue.shallowRef<RecoveryResult['points']>([]);
const recoveryCursor = Vue.shallowRef<{ x: number; y: number } | undefined>();
const recoveryPlaying = Vue.ref(false);
const recoveryRequest = Vue.shallowRef<RecoveryRequest | null>(null);
const recoverySample = Vue.shallowRef<RecoveryFrame | undefined>();
const recoveryFrames = Vue.shallowRef<RecoveryFrame[]>([]);
const recoveryResult = Vue.shallowRef<RecoveryResult | null>(null);
const recoveryError = Vue.ref('');
const recoveryRunId = Vue.ref(0);
const guidanceState = Vue.ref<'idle' | 'ready' | 'running' | 'explaining' | 'reserve-stall' | 'selloff-bottom' | 'speculative-demand' | 'success' | 'failure' | 'done'>('idle');
const guidanceHistory = Vue.shallowRef<{ state: string; frame: RecoveryFrame; request: RecoveryRequest }[]>([]);
Vue.watch(guidanceState, state => {
  if (!['ready', 'explaining', 'reserve-stall', 'selloff-bottom', 'speculative-demand', 'success', 'failure'].includes(state)) return;
  const frame = recoverySample.value ?? recoveryFrames.value[0];
  if (!frame || !recoveryRequest.value) return;
  guidanceHistory.value = [...guidanceHistory.value, {
    state, frame: { ...frame }, request: structuredClone(recoveryRequest.value),
  }];
});
function pauseAtBottom() {
  if (guidanceState.value !== 'running') return;
  guidanceState.value = 'selloff-bottom';
  recoveryPlaying.value = false;
}
const reserveStall = Vue.computed(() => recoveryFrames.value.find(frame => frame.reserveStall &&
  recoverySample.value && frame.time <= recoverySample.value.time));
function pauseForReserve() {
  if (guidanceState.value !== 'running') return;
  guidanceState.value = 'reserve-stall';
  recoveryPlaying.value = false;
}
function getExplanationPauseHours() {
  return chartRef.value?.getExplanationPauseHours(recoveryFrames.value);
}
function pauseForExplanation() {
  if (guidanceState.value !== 'running') return;
  guidanceState.value = 'explaining';
  recoveryPlaying.value = false;
}
function pauseForSpeculation() {
  if (guidanceState.value !== 'running') return;
  guidanceState.value = 'speculative-demand';
  recoveryPlaying.value = false;
}
function resumePlayback() {
  if (!['explaining', 'reserve-stall', 'selloff-bottom', 'speculative-demand'].includes(guidanceState.value)) return;
  guidanceState.value = 'running';
  recoveryPlaying.value = true;
}
let recoveryWorker: Worker | null = null;
let standbyRecoveryWorker: Worker | null = null;

function cancelRecovery() {
  guidanceHistory.value = [];
  guidanceState.value = 'idle';
  recoveryWorker?.terminate();
  recoveryWorker = null;
  recoveryRequest.value = null;
  recoveryPoints.value = [];
  recoveryCursor.value = undefined;
  recoverySample.value = undefined;
  emit('recoveryAmountsChanged', null);
  recoveryPlaying.value = false;
  recoveryFrames.value = [];
  recoveryResult.value = null;
  recoveryError.value = '';
}

function onRecoverySample(sample: { frame: RecoveryFrame; points: RecoveryResult['points']; finished: boolean }) {
  if (!recoveryRequest.value) return;
  recoveryPoints.value = sample.points;
  recoveryCursor.value = { x: sample.frame.time, y: sample.frame.price };
  recoverySample.value = sample.frame;
  emit('recoveryAmountsChanged', {
    circulation: sample.frame.circulation,
    lockedBitcoins: sample.frame.bitcoinsRemaining,
  });
  recoveryPlaying.value = !sample.finished && !recoveryError.value;
  if (sample.finished && guidanceState.value === 'running') {
    guidanceState.value = recoveryResult.value?.recovered ? 'success' : 'failure';
  }
}

function prepareSimulation(shock: Pick<RecoveryRequest, 'startingTime' | 'endingTime' | 'startingPrice'>) {
  cancelRecovery();
  recoveryRunId.value++;
  const request: RecoveryRequest = { ...shock,
    endingTime: shock.startingPrice < rules.value.usdTargetForArgon
      ? dayjs.utc(shock.startingTime).add(12, 'month').add(1, 'day').valueOf()
      : shock.startingTime + (chartEndingTime - chartStartingTime),
    lockedBitcoins: bitcoinsInLiquidLocks.value, rules: JSON.parse(JSON.stringify(rules.value)) };
  recoveryFrames.value = [{ time: shock.startingTime, elapsedHours: 0, price: shock.startingPrice,
    circulation: request.rules.circulation, bitcoinsRemaining: request.lockedBitcoins,
    bitcoinsUnlocked: 0, argonsBurned: 0 }];
  recoveryRequest.value = request;
  guidanceState.value = 'ready';
}

function startPending() {
  if (guidanceState.value !== 'ready' || !recoveryRequest.value) return;
  const request = recoveryRequest.value;
  const history = guidanceHistory.value;
  if (request.startingPrice > request.rules.usdTargetForArgon) startMinting(request);
  else startRecovery(request);
  guidanceHistory.value = history;
}

const miningEngine = new MiningEngine();

function startMinting(shock: Pick<RecoveryRequest, 'startingTime' | 'endingTime' | 'startingPrice'>) {
  cancelRecovery();
  guidanceState.value = 'running';
  recoveryRunId.value++;
  const request: RecoveryRequest = { ...shock,
    endingTime: shock.startingTime + (chartEndingTime - chartStartingTime),
    lockedBitcoins: bitcoinsInLiquidLocks.value,
    rules: JSON.parse(JSON.stringify(rules.value)) };
  recoveryRequest.value = request;
  try {
    const result = miningEngine.run(request);
    recoveryFrames.value = result.frames;
    recoveryResult.value = result;
    recoveryPlaying.value = true;
  } catch (error) {
    guidanceState.value = 'failure';
    recoveryError.value = `Mining failed: ${error instanceof Error ? error.message : error}`;
    recoveryFrames.value = [{ time: shock.startingTime, elapsedHours: 0, price: shock.startingPrice,
      circulation: request.rules.circulation, argonsBurned: 0, bitcoinsUnlocked: 0,
      bitcoinsRemaining: request.lockedBitcoins }];
  }
}

function startRecovery(shock: Pick<RecoveryRequest, 'startingTime' | 'endingTime' | 'startingPrice'>) {
  cancelRecovery();
  guidanceState.value = 'running';
  recoveryRunId.value++;
  const request: RecoveryRequest = {
    ...shock, endingTime: dayjs.utc(shock.startingTime).add(12, 'month').add(1, 'day').valueOf(),
    lockedBitcoins: bitcoinsInLiquidLocks.value,
    rules: JSON.parse(JSON.stringify(rules.value)),
  };
  recoveryFrames.value = [{ time: shock.startingTime, elapsedHours: 0, price: shock.startingPrice,
    argonsBurned: 0, bitcoinsUnlocked: 0, bitcoinsRemaining: request.lockedBitcoins, circulation: request.rules.circulation }];
  recoveryRequest.value = request;
  recoveryPlaying.value = true;
  const worker = standbyRecoveryWorker ?? new RecoveryWorker();
  standbyRecoveryWorker = null;
  recoveryWorker = worker;
  worker.onmessage = event => {
    if (recoveryWorker !== worker) return;
    if (event.data.type === 'frames') {
      const lastTime = recoveryFrames.value[recoveryFrames.value.length - 1].time;
      const incoming = (event.data.frames as RecoveryFrame[]).filter(frame => frame.time > lastTime);
      if (incoming.length) recoveryFrames.value = [...recoveryFrames.value, ...incoming];
    } else if (event.data.type === 'complete') {
      const result = event.data.result as RecoveryResult;
      recoveryFrames.value = result.frames;
      recoveryResult.value = result;
      worker.terminate();
      recoveryWorker = null;
    } else if (event.data.type === 'error') {
      guidanceState.value = 'failure';
      recoveryError.value = `Recovery failed: ${event.data.message}`;
      recoveryPlaying.value = false;
      worker.terminate();
      recoveryWorker = null;
    }
  };
  worker.onerror = () => {
    if (recoveryWorker !== worker) return;
    guidanceState.value = 'failure';
    recoveryError.value = 'Recovery failed. Try adjusting the inputs.';
    recoveryPlaying.value = false;
    worker.terminate();
    recoveryWorker = null;
  };
  worker.postMessage(request);
}

Vue.watch([rules, bitcoinsInLiquidLocks], cancelRecovery, { deep: true });
Vue.onBeforeUnmount(() => {
  cancelRecovery();
  standbyRecoveryWorker?.terminate();
});

function openVideoOverlay() {
  emitter.emit('openVideoOverlay');
}

Vue.onMounted(() => {
  // Load the worker ahead of the first interaction without running a simulation.
  standbyRecoveryWorker = new RecoveryWorker();
  // This is a visual starting baseline, not a generated simulation result.
  chartRef.value?.addPoints([
    { startingDate: new Date(chartStartingTime).toISOString(), endingPrice: 1, showPointOnChart: false },
    { startingDate: new Date(chartEndingTime).toISOString(), endingPrice: 1, showPointOnChart: false },
  ]);
});
</script>

<style lang="scss">
.RecoveryPanel {
  position: absolute;
  left: 6%;
  right: 4%;
  z-index: 30;
}

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
