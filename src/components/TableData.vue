<template>
  <div class="z-50 relative">
    <div class="absolute top-0 z-50 h-full w-full flex flex-col justify-end">
      <div BottomController class="h-[68px] sticky bottom-0 left-0 right-0 pt-10 pl-2 text-sm">
        <div class="text-center">
          Jump to... &nbsp;
          <button @click="jumpToFormula" class="text-blue-600 hover:underline">Formula</button>
          &nbsp;
          <button @click="jumpToStart" class="text-blue-600 hover:underline">Current Date</button>
          &nbsp;
          <button @click="jumpToStart" class="text-blue-600 hover:underline">Start</button>
          &nbsp;
          <button @click="jumpToCollapse" class="text-blue-600 hover:underline">Collapse</button>
          &nbsp;
          <button @click="jumpToRecovery" class="text-blue-600 hover:underline">Recovery</button>
          &nbsp;
          <button @click="downloadData" class="text-blue-600 hover:underline">Download</button>
        </div>
      </div>
    </div>
    <table v-if="rows.length > 0" class="w-full">
      <thead class="sticky top-0 z-50 bg-[#E6EAF3] h-[58px]">
        <tr class="border-b border-slate-400">
          <th class="pl-4 text-left">Date</th>
          <th class="text-left">Stage</th>
          <th class="text-right">Block</th>
          <th class="text-right">Starting Capital</th>
          <th class="text-right">Ending Capital</th>
          <th class="text-right">Starting Tokens</th>
          <th class="text-right">Ending Tokens</th>
          <th class="text-right">Starting Price</th>
          <th class="text-right">Ending Price</th>
          <th class="text-right">Capital Change</th>
          <th class="pr-4 text-right">Token Change</th>
        </tr>
      </thead>
      <tbody class="px-4">
        <tr v-for="row in rows" class="border-b border-slate-300 font-mono text-sm text-slate-600 h-8 align-middle" :class="`${rowClass(row)}`">
          <td class="pl-4 text-left">{{ dayjs.utc(row.startingDate).format('YYYY-MM-DD') }}</td>
          <td class="text-left">{{ row.stage }}</td>
          <td class="text-right">#{{ row.startingBlock }}</td>
          <td class="text-right">{{ addCommas(row.startingCapital, 2) }}</td>
          <td class="text-right">{{ addCommas(row.endingCapital, 2) }}</td>
          <td class="text-right">{{ addCommas(row.startingCirculation, 2) }}</td>
          <td class="text-right">{{ addCommas(row.endingCirculation, 2) }}</td>
          <td class="text-right">{{ addCommas(row.startingPrice.toFixed(2), 2) }}</td>
          <td class="text-right">{{ addCommas(row.endingPrice.toFixed(2), 2) }}</td>
          <td class="text-right">{{ addCommas(getCapitalChange(row), 2) }}</td>
          <td class="pr-4 text-right">{{ addCommas(getTokenChange(row), 2) }}</td>
        </tr>
      </tbody>
    </table>
    <div class="text-center py-20">
      <DownloadIcon class="h-[40px] inline-block" />
      <div class="text-xl font-light mt-3">Download The Full Dataset for This Analysis Model</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as Vue from 'vue';
import dayjs from 'dayjs';
import emitter from '../emitters/basic';
import { addCommas } from '../lib/BasicUtils';
import DownloadIcon from '@/assets/download-icon.svg';

const rows: Vue.Ref<any[]> = Vue.ref([]);

emitter.on('simulationData', (data: any) => {
  let currentBlockNum = 0;
  for (const row of data.startData) {
    row.stage = 'Start';
    row.startingBlock = currentBlockNum;
    currentBlockNum += row.blockCount;
  }
  for (const row of data.collapseData) {
    row.stage = 'Collapse';
    row.startingBlock = currentBlockNum;
    currentBlockNum += row.blockCount;
  }
  for (const row of data.recoveryData) {
    row.stage = 'Recovery';
    row.startingBlock = currentBlockNum;
    currentBlockNum += row.blockCount;
  }
  rows.value = [
    ...data.startData,
    ...data.collapseData,
    ...data.recoveryData,
  ];
});

function getCapitalChange(row: any) {
  const capitalAdded = Object.values(row.capitalAddedMap as Record<string, number>).reduce((a, b) => a + b, 0);
  const capitalRemoved = Object.values(row.capitalRemovedMap as Record<string, number>).reduce((a, b) => a + b, 0);
  return capitalAdded - capitalRemoved;
}

function getTokenChange(row: any) {
  const tokenAdded = Object.values(row.circulationAddedMap as Record<string, number>).reduce((a, b) => a + b, 0);
  let tokenRemoved = Object.values(row.circulationRemovedMap as Record<string, number>).reduce((a, b) => a + b, 0);
  tokenRemoved = Math.max(0, tokenRemoved - row.seigniorage);
  
  return tokenAdded - tokenRemoved;
}

function rowClass(row: any) {
  if (row.endingPrice > row.startingPrice) {
    return 'isRecovering';
  } else if (row.endingPrice < 1) {
    return 'isCollapsing';
  } else {
    return 'isSteady';
  }
}

function jumpToFormula() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
</script>

<style lang="scss" scoped>
.isSteady {
  @apply text-slate-400;
}
.isCollapsing {
  @apply bg-red-100;
}
.isRecovering {
  @apply bg-green-100;
}
[BottomController] {
  background: linear-gradient(to bottom, rgba(var(--sam-background-rgb), 0) 0%, var(--sam-background) 50%, var(--sam-background) 100%);
}
</style>
