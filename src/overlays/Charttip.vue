<template>
  <div class="absolute z-[1001] pointer-events-none" :style="`left: ${config.left}px; top: ${config.top}px; opacity: ${config.opacity}`">
    
    <div Arrow ref="arrowRef" class="relative transform -translate-x-1/2 -translate-y-[100%] -mt-1 rotate-180 z-1">
      <svg class="relative z-10" width="24" height="12" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0L24 12H0L12 0Z" fill="white"/>
      </svg>
      <svg class="absolute z-0 -top-0.5 left-[-1.5px] opacity-20" width="26" height="14" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0L24 12H0L12 0Z" fill="black"/>
      </svg>
    </div>

    <div ref="boxRef" :style="`transform: translateX(${boxConfig.translateX}%)`" class="absolute left-0 bottom-[23px] px-3 z-0 whitespace-nowrap flex flex-col shadow-lg bg-white border border-slate-400/60 rounded-lg">
      <table class="w-full">
        <thead>
          <tr>
            <th colspan="3" class="text-left">{{ dayjs.utc(item.startingDate).format('MMMM D, YYYY') }}</th>
          </tr>
        </thead>
        <tbody class="align-middle" v-if="config.datasetIndex === 0">
          <tr>
            <td class="text-left opacity-50">Argon Price (USD)</td>
            <td class="text-right font-bold">${{ formatPrice(usd(endingPrice), 3) }}</td>
            <td>
              <span v-if="priceDiff" class="font-normal relative" :class="priceDiff > 0 ? 'text-green-700' : 'text-red-500'">
                <span class="font-light">(</span><span class="font-bold">{{priceDiff > 0 ? '+' : '' }}{{ addCommas(priceDiff) }}%<span class="font-light">)</span></span>
              </span>
              <span v-else class="font-bold text-slate-400"><span class="font-light">(</span>0%<span class="font-light">)</span></span>
            </td>
          </tr>
          <tr>
            <td class="text-left opacity-50">Bitcoins In Vault</td>
            <td class="text-right font-bold">{{ formatShorthandNumber(endingBitcoinsVaulted, { mantissa: 2 }) }}</td>
            <td>
              <span v-if="bitcoinDiff" class="font-normal relative" :class="bitcoinDiff > 0 ? 'text-green-700' : 'text-red-500'">
                <span class="font-light">(</span><span class="font-bold">{{bitcoinDiff > 0 ? '+' : '' }}{{ addCommas(bitcoinDiff) }}%<span class="font-light">)</span></span>
              </span>
              <span v-else class="font-bold text-slate-400"><span class="font-light">(</span>0%<span class="font-light">)</span></span>
            </td>
          </tr>
          <tr>
            <td class="text-left opacity-50">Circulation Supply</td>
            <td class="text-right font-bold">{{ formatShorthandNumber(endingCirculation) }}</td>
            <td>
              <span v-if="circulationDiff" class="font-normal relative" :class="circulationDiff > 0 ? 'text-green-700' : 'text-red-500'">
                <span class="font-light">(</span><span class="font-bold">{{circulationDiff > 0 ? '+' : '' }}{{ addCommas(circulationDiff) }}%<span class="font-light">)</span></span>
              </span>
              <span v-else class="font-bold text-slate-400"><span class="font-light">(</span>0%<span class="font-light">)</span></span>
            </td>
          </tr>
          <tr>
            <td class="text-left opacity-50">Market Capital (USD)</td>
            <td class="text-right font-bold">${{ formatShorthandNumber(usd(endingCapital)) }}</td>
            <td>
              <span v-if="capitalDiff" class="font-normal relative" :class="capitalDiff > 0 ? 'text-green-700' : 'text-red-500'">
                <span class="font-light">(</span><span class="font-bold">{{capitalDiff > 0 ? '+' : '' }}{{ addCommas(capitalDiff) }}%<span class="font-light">)</span></span>
              </span>
              <span v-else class="font-bold text-slate-400"><span class="font-light">(</span>0%<span class="font-light">)</span></span>
            </td>
          </tr>
        </tbody>
        <tbody class="align-middle" v-else>
          <tr>
            <td colspan="2" class="text-left opacity-50">Change In USD Value: </td>
            <td>
              <span v-if="dollarDiff" class="font-normal relative" :class="dollarDiff > 0 ? 'text-green-700' : 'text-red-500'">
                <span class="font-bold">{{dollarDiff > 0 ? '+' : '' }}{{ addCommas(dollarDiff) }}%</span>
              </span>
              <span v-else class="font-bold text-slate-400">0%</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
  </div>
</template>

<script setup lang="ts">
import * as Vue from 'vue';
import { useBasicStore } from '../store';
import { toUsd } from '../lib/ArgonTarget';
import dayjs from 'dayjs';
import dayjsUtc from 'dayjs/plugin/utc';
import { addCommas, formatShorthandNumber, formatPrice, formatChangePct } from '../lib/BasicUtils';

dayjs.extend(dayjsUtc);

const basicStore = useBasicStore();
const usd = (value: number) => toUsd(value, basicStore.rules.usdTargetForArgon);

const props = defineProps<{
  config: any
}>();

const item = Vue.ref({});

const arrowRef: Vue.Ref<HTMLElement | null> = Vue.ref(null);
const boxRef: Vue.Ref<HTMLElement | null> = Vue.ref(null);
const boxConfig = Vue.ref({ translateX: 50 });

const endingPrice = Vue.ref(Math.min(item.value.endingPrice || 1.00, 1.00));
const priceDiff = Vue.ref(0);

const endingBitcoinsVaulted = Vue.ref(item.value.endingVaultMeta?.bitcoinCount || 0);
const bitcoinDiff = Vue.ref(0);

const endingCirculation = Vue.ref(item.value.endingCirculation || 0);
const circulationDiff = Vue.ref(0);

const endingCapital = Vue.ref(item.value.endingCapital || 0);
const capitalDiff = Vue.ref(0);

const endingDollarValue = Vue.ref(item.value.dollar?.endingPrice || 0);
const dollarDiff = Vue.ref(0);

function updateBoxPosition() {
  const arrowRect = arrowRef.value?.getBoundingClientRect() || { left: 0};
  const boxRect = boxRef.value?.getBoundingClientRect() || { left: 0};
  const boxWidth = boxRect.width || 0;
  const halfBoxWidth = boxWidth / 2;
  const arrowLeft = arrowRect.left + (arrowRect.width / 2);
  const windowWidth = window.innerWidth

  if (arrowLeft <= halfBoxWidth) {
    const moveLeftPx = halfBoxWidth - arrowLeft;
    const moveLeftPct = -50 * (1 - (moveLeftPx / halfBoxWidth));
    boxConfig.value.translateX = moveLeftPct;
  } else if ((windowWidth - arrowLeft) < halfBoxWidth) {
    const moveRightPx = windowWidth - arrowLeft;
    const moveRightPct = -50 * (1 - (moveRightPx / halfBoxWidth));
    boxConfig.value.translateX = -50 + moveRightPct;
  } else {
    boxConfig.value.translateX = -50;
  }
}

Vue.watch(props.config, () => {
  updateBoxPosition();
  setTimeout(() => updateBoxPosition, 100);

  item.value = props.config.item;
  updateItemsDiffs()
});

function updateItemsDiffs() {
  const startingPrice = Math.min(item.value.startingPrice, 1.00);
  endingPrice.value = Math.min(item.value.endingPrice, 1.00);
  if (!startingPrice || !endingPrice.value) {
    return;
  }
  priceDiff.value = formatChangePct((endingPrice.value - startingPrice) / startingPrice);

  endingBitcoinsVaulted.value = item.value.endingVaultMeta?.bitcoinCount || 0;
  const startingBitcoinsVaulted = item.value.startingVaultMeta?.bitcoinCount || 0;
  bitcoinDiff.value = formatChangePct((endingBitcoinsVaulted.value - startingBitcoinsVaulted) / startingBitcoinsVaulted);
  if (bitcoinDiff.value > 1_000) {
    bitcoinDiff.value = 1_000;
  }

  endingCirculation.value = item.value.endingCirculation || 0;
  const startingCirculation = item.value.startingCirculation || 0;
  circulationDiff.value = formatChangePct((endingCirculation.value - startingCirculation) / startingCirculation);
  if (circulationDiff.value > 1_000) {
    circulationDiff.value = 1_000;
  }
  
  endingCapital.value = item.value.endingCapital || 0;
  const startingCapital = item.value.startingCapital || 0;
  capitalDiff.value = formatChangePct((endingCapital.value - startingCapital) / startingCapital);
  if (capitalDiff.value > 1_000) {
    capitalDiff.value = 1_000;
  }

  const startingDollarValue = 1.00;
  endingDollarValue.value = Math.min(item.value.dollar.endingPrice, 1.00);
  dollarDiff.value = formatChangePct((endingDollarValue.value - startingDollarValue) / startingDollarValue);
}

</script>

<style lang="scss" scoped>
  table {
    @apply mb-1;
    thead tr {
      @apply border-b border-slate-200;
    }
    thead th {
      @apply py-2;
    }
    td {
      @apply py-0.5;
    }
    tbody tr {
      @apply border-b border-slate-200;
      &:last-child {
        @apply border-none;
      }
      td:nth-child(2) {
        @apply min-w-[70px];
      }
      td:last-child {
        @apply pl-1 min-w-[60px];
      }
    }
    svg {
      @apply w-4 h-4;
    }
  }
</style>