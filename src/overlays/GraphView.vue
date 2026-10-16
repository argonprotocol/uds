<template>
  <div v-if="shouldShow" :style="{ left: `${padding}px`, right: `${padding}px`, bottom: `${padding}px`, top: `${top +4}px` }" class="absolute z-[2000] bg-white border border-slate-500/30 rounded-b shadow-xl">

    <div CloseTab @click="closeTab()" :style="{ left: `${arrowLeft - 1}px`, top: 0, width: `${width + (isRight ? 3 : 10)}px` }" :class="{ isRight }" class="absolute group cursor-pointer flex flex-col items-center justify-center -translate-x-1/2 -translate-y-full h-16 bg-white text-center text-slate-400/70 font-light">
      <div CloseIcon class="mt-[-5px] flex flex-row items-center text-xs px-2 justify-center p-0.5 space-x-1 border border-slate-400/70 rounded-full bg-white whitespace-nowrap group-hover:text-slate-500">
        CLOSE TIME GRAPH
      </div>

      <div class="group-hover:text-slate-400">
        <template v-if="id === 'bitcoinCoverage'">
          Burn Coverage
        </template>
        <template v-else-if="id === 'bitcoinProfits'">
          Vaulting Profits
        </template>
        <template v-else-if="id === 'argonRelativeToDollar'">
          Relativity to Dollar
        </template>
        <template v-else-if="id === 'argonLosses'">
          Losses Due to Fear
        </template>
        <template v-else-if="id === 'seigniorageProfits'">
          Seigniorage Profits
        </template>
        <template v-else-if="id === 'seigniorageLosses'">
          Seigniorage Losses
        </template>
        <template v-else-if="id === 'annualTransactions'">
          Peer-to-Peer Txns
        </template>
        <template v-else-if="id === 'annualMicropayments'">
          Micropayment ARR
        </template>
      </div>
    </div>

    <div class="relative w-full h-full flex flex-col px-6 pt-7 pb-3">
      <h2 v-if="id === 'bitcoinCoverage'">
        Bitcoin Burn Coverage from {{ dateRangeStr }}
      </h2>
      <h2 v-else-if="id === 'bitcoinProfits'">
        Bitcoin Vaulting Profits from {{ dateRangeStr }}
      </h2>
      <h2 v-else-if="id === 'argonRelativeToDollar'">
        Argon Relative to Dollar from {{ dateRangeStr }}
      </h2>
      <h2 v-else-if="id === 'argonLosses'">
        Argon Holder Losses from {{ dateRangeStr }}
      </h2>
      <h2 v-else-if="id === 'seigniorageProfits'">
        Seigniorage Profits from {{ dateRangeStr }}
      </h2>
      <h2 v-else-if="id === 'seigniorageLosses'">
        Seigniorage Losses from {{ dateRangeStr }}
      </h2>
      <h2 v-else-if="id === 'annualTransactions'">
        Peer-to-Peer Transaction Volume from {{ dateRangeStr }}
      </h2>
      <h2 v-else-if="id === 'annualMicropayments'">
        Annual Reocurring Micropayment Revenue from {{ dateRangeStr }}
      </h2>

      <div class="mb-10 mt-2 font-light w-11/12 opacity-60">
        <p v-if="id === 'bitcoinCoverage'">This graph shows the number of argons that would be burned if all bitcoins in the Vaults were unlocked at any given moment. The 
          lower Argon's price drops below its target price, the higher the coverage.
        </p>
        <p v-else-if="id === 'bitcoinProfits'">
          This graph shows the profits earned by vaulted bitcoins. They earn yield in two primary ways. The first is from ratcheting as the price of bitcoin fluctuates. The second is from covering shorts whenever argon drops below its target price.
        </p>
        <p v-else-if="id === 'argonRelativeToDollar'">
          This graph shows the price of Argon relative to the dollar. Because of the dollar's continual devaluation, the price of Argon should constantly increase over time.
        </p>
        <p v-else-if="id === 'argonLosses'">
          This graph captures the loss that accrues to Argon holders when they sell below its target price due to fear or some other panic.
        </p>
        <p v-else-if="id === 'seigniorageProfits'">
          Argon operates on a seigniorage model. This means that instead of incoming capital being funneled into reserves, the capital accrues directly to the owners of the 
          currency, which in this case is a combination of those who hold Argonots and who are active miners in the network.
        </p>
        <p v-else-if="id === 'seigniorageLosses'">
          Regardless of whether the argon floats above, below or at par with its target price, the Argonots never take a seigniorage loss.
        </p>
      </div>
      <div class="relative grow">
        <div ChartWrapper class="absolute w-full h-full left-0 top-0">
          <canvas id="MyChart" ref="chartRef" class="relative w-full h-full"></canvas>
        </div>
      </div>
    </div>

  </div>
</template>

<script lang="ts" setup>
import * as Vue from 'vue';
import { useBasicStore } from '../store';
import { toUsd } from '../lib/ArgonTarget';
import emitter from '../emitters/basic';
import dayjs from 'dayjs';
import dayjsUtc from 'dayjs/plugin/utc';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, TimeScale } from 'chart.js';
import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm';
import Marker from '../engine/Marker';

dayjs.extend(dayjsUtc);

const basicStore = useBasicStore();
const usd = (value: number) => toUsd(value, basicStore.rules.usdTargetForArgon);
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, TimeScale);

const props = defineProps<{
  items: { startingDate: string, endingPrice: number }[];
}>();

const shouldShow = Vue.ref(false);
const padding = Vue.ref(0);
const top = Vue.ref(0);
const width = Vue.ref(0);

const isRight = Vue.ref(false);

const dateRangeStr = Vue.ref('');

const arrowLeft = Vue.ref(0);

const chartRef = Vue.ref<HTMLCanvasElement | null>(null);

let id = '';
let chart: Chart | null = null;

const chartPoints: any[] = [];

function addPoints(items: any[]) {
  if (!chart) return;

  for (const item of items) {
    const date = dayjs.utc(item.startingDate);
    let value = 0;

    if (id === 'bitcoinCoverage') {
      value = item.endingVaultMeta.argonBurnCapacity;
    } else if (id === 'bitcoinProfits') {
      value = item.endingVaultMeta.profitsToDate;
    } else if (id === 'argonRelativeToDollar') {
      value = item.step.dollarDiffPct;
    } else if (id === 'argonLosses') {
      value = usd(item.argonLossDueToFear);
    } else if (id === 'seigniorageProfits') {
      value = usd(item.seigniorageProfits);
    } else if (id === 'seigniorageLosses') {
      value = 0;
    } else if (id === 'annualTransactions') {
      value = item.annualTransactions;
    } else if (id === 'annualMicropayments') {
      value = Marker.calculateWageProtectedPrice(item.annualMicropayments, item.lowestPrice);
    }

    chartPoints.push({ x: date.valueOf(), y: value });
  }

  if (['argonRelativeToDollar', 'seigniorageLosses'].includes(id)) {
    (chart as any).options.scales.y.max = 100;
    (chart as any).options.scales.y.min = -100;
  } else {
    (chart as any).options.scales.y.max = undefined;
    (chart as any).options.scales.y.min = 0;
  }

  const firstItem = items[0];
  const lastItem = items[items.length - 1];
  dateRangeStr.value = `${dayjs.utc(firstItem.startingDate).format('MMM D, YYYY')} to ${dayjs.utc(lastItem.startingDate).format('MMM D, YYYY')}`

  chart.update();
}

function loadData(items: any[]) {
  if (!chart) return;

  addPoints(items);
  chart.update();
}

function createChart() {
  if (!chartRef.value) return;

  chartPoints.splice(0, chartPoints.length);
  chart = new Chart(chartRef.value, {
    type: 'line',
    data: {
      datasets: [{
        data: chartPoints,
        borderColor: '#9765a8',
        borderWidth: 4,
        pointBorderWidth: 0,
        pointRadius: 0,
      }]
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: 0,
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day'
          },
          display: true,
          min: dayjs(props.items[0].startingDate).valueOf(),
          max: dayjs(props.items[props.items.length - 1].startingDate).valueOf(),
        },
        y: {
          display: true,
          min: 0,
        }
      },
      plugins: {
        tooltip: {
          enabled: true,
        }
      }
    },  
  });
  loadData(props.items);
}

function destroyChart() {
  if (!chart) return;
  chart.destroy();
}

function closeTab() {
  shouldShow.value = false;
  destroyChart();
  emitter.emit('graphViewHidden');
}

emitter.on('showGraphView', (data: any) => {
  id = data.id;
  shouldShow.value = true;
  padding.value = data.padding;
  top.value = data.top;
  width.value = data.width;
  arrowLeft.value = data.arrowLeft;
  isRight.value = ['bitcoinProfits', 'argonLosses', 'seigniorageLosses', 'annualMicropayments'].includes(id);
  setTimeout(createChart, 1);
});

emitter.on('hideGraphView', () => {
  closeTab();
});
</script>

<style lang="scss" scoped>
h2 {
  @apply text-xl font-semibold;
}
[CloseTab] {
  background: linear-gradient(to top, white 50%, #f8f9fc 100%);

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 1px;
    height: 100%;
    background: rgba(203, 213, 225, 0.8);
  }

  &:after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 1px;
    height: 100%;
    background: linear-gradient(to top, rgba(203, 213, 225, 0.8) 50%, #f8f9fc 100%);
  }

  &.isRight {
    &:before {
      background: linear-gradient(to top, rgba(203, 213, 225, 0.8) 50%, #f8f9fc 100%);
    }
    &:after {
      background: rgba(203, 213, 225, 0.8);
    }
  }
}
</style>