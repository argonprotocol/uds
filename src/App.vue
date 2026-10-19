<template>
    <div v-if="isTooNarrow" class="flex flex-col h-screen w-screen select-none justify-center px-4">
    <div class="text-center text-slate-400/80 text-xl pt-4 font-bold mb-10 px-16" style="text-shadow: 1px 1px 0 rgba(255,255,255,0.8);">
      This tool must be viewed on a larger screen. Please use a desktop or laptop.
    </div>
    <wistia-player media-id="o32bfzhcor"></wistia-player>
  </div>
  <div v-else class="flex flex-row min-h-screen w-screen">
    <div class="flex flex-col h-screen grow min-w-[60rem] min-h-[55rem]">
      <Header v-model:locked-bitcoins="lockedBitcoins" :current-price="currentPrice" :recovery-amounts="recoveryAmounts" />
      <p v-if="isReady && !btcRangeFeasible" class="p-6 text-red-700" role="alert">The required BTC reserve exceeds 17,500,000 BTC. Reduce circulation to run this scenario.</p>
      <Main v-if="isReady && btcRangeFeasible" class="grow" :locked-bitcoins="lockedBitcoins" @priceChanged="currentPrice = $event" @recoveryAmountsChanged="recoveryAmounts = $event" />
      <Loading v-else-if="isLoading" class="grow" />
      <Running v-else-if="isRunning" class="grow" />
    </div>
    <WelcomeOverlay />
    <WelcomeStepOne v-if="tourStep === 1" />
    <WelcomeStepTwo v-else-if="tourStep === 2" />
    <InsightOverlay />
    <TooltipOverlay />
    <VideoOverlay />
    <WhitepapersOverlay />
    <FaqOverlay />
    <DetailsOfLiquidLocking />
    <ConfirmConfigReset />
  </div>
</template>

<script setup lang="ts">
import * as Vue from 'vue';
import InsightOverlay from './overlays/InsightOverlay.vue';
import WelcomeOverlay from './overlays/WelcomeOverlay.vue';
import WelcomeStepOne from './overlays/WelcomeStepOne.vue';
import WelcomeStepTwo from './overlays/WelcomeStepTwo.vue';
import TooltipOverlay from './overlays/TooltipOverlay.vue';
import VideoOverlay from './overlays/VideoOverlay.vue';
import WhitepapersOverlay from './overlays/WhitepapersOverlay.vue';
import FaqOverlay from './overlays/FaqOverlay.vue';
import DetailsOfLiquidLocking from './overlays/Details.vue';
import ConfirmConfigReset from './overlays/ConfirmConfigReset.vue';
import { storeToRefs } from 'pinia';
import Header from './components/Header.vue';
import Running from './panels/Running.vue';
import Main from './panels/Main.vue';
import Loading from './panels/Loading.vue';
import { useBasicStore } from './store';
import emitter from './emitters/basic';
import { readUrlInputs } from './lib/UrlInputs';
import { mainnetDefaults } from './lib/RulesConfig';
import { minimumLockedBitcoins, MAX_LOCKED_BITCOINS } from './lib/RecoveryRunner';

const basicStore = useBasicStore();
const { completedWelcome, tourStep, isLoading, isRunning, isReady } = storeToRefs(basicStore);
const urlInputs = readUrlInputs(window.location.search);
const lockedBitcoins = Vue.ref(urlInputs.bitcoinsInLiquidLocks ?? mainnetDefaults.bitcoinsInLiquidLocks);
const savedRules = JSON.parse(sessionStorage.getItem('rules') || '{}');
const networkCirculation = Math.round(mainnetDefaults.circulation);
const initialCirculation = Number(urlInputs.circulation ?? savedRules.circulation ?? networkCirculation);
basicStore.rules.circulation = Number.isFinite(initialCirculation)
  ? Math.max(networkCirculation, initialCirculation) : networkCirculation;
const minimumBtc = Vue.computed(() => minimumLockedBitcoins(basicStore.rules));
const btcRangeFeasible = Vue.computed(() => minimumBtc.value <= MAX_LOCKED_BITCOINS);
Vue.watchEffect(() => {
  const minimum = minimumBtc.value;
  const value = Number(lockedBitcoins.value);
  lockedBitcoins.value = Math.min(MAX_LOCKED_BITCOINS,
    Math.max(minimum, Number.isFinite(value) ? value : minimum));
});
const currentPrice = Vue.ref(basicStore.rules.usdTargetForArgon);
const recoveryAmounts = Vue.shallowRef<{ circulation: number; lockedBitcoins: number } | null>(null);

const windowWidth = Vue.ref(window.innerWidth);

let scriptIsInjected = false;

const isTooNarrow = Vue.computed(() => {
  const isLessThan1224 = windowWidth.value < 1224;

  if (isLessThan1224 && !scriptIsInjected) {
    const script = document.createElement('script');
    script.src = 'https://fast.wistia.com/player.js';
    script.async = true;
    document.head.appendChild(script);
    scriptIsInjected = true;
  }

  return isLessThan1224;
});

Vue.onMounted(() => {
  if (!completedWelcome.value && tourStep.value === 0) {
    emitter.emit('openWelcomeOverlay');
  }

  window.addEventListener('resize', () => {
    windowWidth.value = window.innerWidth;
  });
});

basicStore.load();
</script>
