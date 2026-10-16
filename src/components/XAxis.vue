<template>
  <div class="X-AXIS COMPONENT relative text-sm text-slate-400">
    <div class="absolute top-0 border-t border-slate-300 pointer-events-none"
      :style="{ left: `${plotLeft}px`, width: `${Math.max(0, plotRight - plotLeft)}px` }" aria-hidden="true" />
    <ul ref="datesRef" Dates class="relative pt-0.5 whitespace-nowrap h-7 mb-1">
      <li v-for="(tick, index) in ticks" :key="tick.time" class="absolute border-l border-slate-300 text-center"
        :style="{ left: `${timePosition(tick.time)}px`, width: index < ticks.length - 1 ? `${timePosition(ticks[index + 1].time) - timePosition(tick.time)}px` : ticks.length > 1 ? `${timePosition(tick.time) - timePosition(ticks[index - 1].time)}px` : undefined }">
        <span class="inline-block" :style="{ visibility: hiddenLabels.includes(index) ? 'hidden' : 'visible' }">{{ tick.label }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import * as Vue from 'vue';

const props = defineProps<{
  phases: any[];
  startingTime: number;
  endingTime: number;
  loadPct: number;
  getPointPosition: (index: number) => { x: number, y: number };
  plotLeft: number;
  plotRight: number;
}>();

const datesRef = Vue.ref<HTMLElement>();
const hiddenLabels = Vue.ref<number[]>([]);
const dailyTickAnchor = props.startingTime;
let resizeObserver: ResizeObserver | undefined;

function updateLabelVisibility() {
  if (!datesRef.value) return;
  const bounds = datesRef.value.getBoundingClientRect();
  hiddenLabels.value = Array.from(datesRef.value.querySelectorAll('li span')).flatMap((label, index) => {
    const rect = label.getBoundingClientRect();
    return rect.left < bounds.left + props.plotLeft || rect.right > Math.min(bounds.left + props.plotRight, bounds.right, window.innerWidth) ? [index] : [];
  });
}

Vue.onMounted(() => {
  resizeObserver = new ResizeObserver(updateLabelVisibility);
  resizeObserver.observe(datesRef.value!);
  updateLabelVisibility();
  document.fonts.ready.then(updateLabelVisibility);
});
Vue.onBeforeUnmount(() => resizeObserver?.disconnect());

const ticks = Vue.computed(() => {
  const labels: { time: number; label: string }[] = [];
  const start = new Date(props.startingTime);
  const end = new Date(props.endingTime);
  const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
  const monthly = props.endingTime - props.startingTime <= 366 * 86_400_000;
  if (props.endingTime - props.startingTime <= 31 * 86_400_000) {
    const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    const interval = 5 * 86_400_000;
    const firstTick = dailyTickAnchor + Math.ceil((props.startingTime - dailyTickAnchor) / interval) * interval;
    for (let time = firstTick; time <= props.endingTime; time += interval) {
      labels.push({ time, label: dateFormat.format(new Date(time)) });
    }
  } else if (monthly) {
    let time = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1);
    if (time < props.startingTime) time = Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1);
    while (time <= props.endingTime) {
      const date = new Date(time);
      labels.push({ time, label: monthFormat.format(date) });
      time = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
    }
  } else {
    for (let year = start.getUTCFullYear(); year <= end.getUTCFullYear(); year += 10) {
      labels.push({ time: Date.UTC(year, 0, 1), label: `${year}s` });
    }
    if (labels.at(-1)?.time !== props.endingTime) {
      labels.push({ time: props.endingTime, label: String(end.getUTCFullYear()) });
    }
  }
  return labels;
});

Vue.watch([ticks, () => props.plotLeft, () => props.plotRight], async () => {
  await Vue.nextTick();
  updateLabelVisibility();
});

function timePosition(time: number) {
  const progress = (time - props.startingTime) / (props.endingTime - props.startingTime);
  return props.plotLeft + progress * (props.plotRight - props.plotLeft);
}
</script>
