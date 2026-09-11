<template>
  <div Selection class="ChartSelector Component absolute -top-3 bottom-[80px] cursor-pointer z-[60]" :style="`left: ${leftInPx}px; width: ${widthInPx}px`">
    <div EdgeLeft @pointerdown="onPointerDown" @pointerup="onPointerUp"></div>
    <div SelectionBg @pointerdown="onPointerDown" @pointerup="onPointerUp"></div>
    <div EdgeRight @pointerdown="onPointerDown" @pointerup="onPointerUp"></div>
    <div SelectionBorder class=""></div>
    <ChartMarker :style="{ opacity: defaultMarkerOpacity }" direction="left" :config="chartMarkerLeft" />
    <ChartMarker :style="{ opacity: defaultMarkerOpacity }" direction="right" :config="chartMarkerRight" />
  </div>
</template>

<script setup lang="ts">
import * as Vue from 'vue';
import ChartMarker from '../overlays/ChartMarker.vue';

const props = defineProps<{
  config: {
    firstIdx: number,
    lastIdx: number,
  },
  helpers: {
    getPointPosition: (idx: number) => any,
    getItem: (idx: number) => any,
    getLastItem: () => any,
  },
  defaultMarkerOpacity?: number,
}>();

const emit = defineEmits(['openPlayer', 'move']);

const leftInPx = Vue.ref(0);
const widthInPx = Vue.ref(0);

const chartMarkerLeft = Vue.ref({ top: 0, opacity: 0, item: {} as any });
const chartMarkerRight = Vue.ref({ top: 0, opacity: 0, item: {} as any });

let currentPointPos = {
  firstX: 0,
  lastX: 0,
};

const dragMeta: { 
  isPointerDown: boolean,
  wasDragged: boolean, 
  startOffset: number, 
  startWidth: number, 
  side: string | null,
  startX: number,
  startY: number,
  startMillis: number,
} = { isPointerDown: false, wasDragged: false, startOffset: 0, startWidth: 0, side: null, startX: 0, startY: 0, startMillis: 0 };

Vue.watch(() => props.config, (newVal) => {
  if (!newVal.firstIdx && !newVal.lastIdx) return;
  const previousPointPos = props.helpers.getPointPosition(Math.max(newVal.firstIdx - 1, 0));
  const firstPointPos = props.helpers.getPointPosition(newVal.firstIdx);
  const firstMarker = props.helpers.getItem(newVal.firstIdx);

  const lastPointPos = props.helpers.getPointPosition(newVal.lastIdx);
  const lastMarker = props.helpers.getItem(newVal.lastIdx);
  
  const firstX = firstPointPos.x as number;
  const lastX = lastPointPos.x as number;

  const finalChartMarker = props.helpers.getLastItem();
  const isFinalPoint = finalChartMarker && newVal.lastIdx === finalChartMarker.idx;
  
  currentPointPos = { firstX, lastX };  
  
  leftInPx.value = firstX - 10;
  widthInPx.value = lastX - firstX + (isFinalPoint ? 18 : 7);

  chartMarkerLeft.value = { 
    top: previousPointPos.y + 12, 
    opacity: props.defaultMarkerOpacity ? 0 : 1,
    item: firstMarker,
  };

  chartMarkerRight.value = { 
    top: lastPointPos.y + 12, 
    opacity: props.defaultMarkerOpacity ?? 1, 
    item: lastMarker,
  };
}, { immediate: true, deep: true });

function openPlayer() {
  emit('openPlayer');
}

function onPointerDown(event: PointerEvent) {
  const elem = (event.target as HTMLElement);
  
  dragMeta.isPointerDown = true;
  dragMeta.wasDragged = false;
  dragMeta.startWidth = currentPointPos.lastX - currentPointPos.firstX;
  dragMeta.startX = event.clientX;
  dragMeta.startY = event.clientY;
  dragMeta.startMillis = new Date().getTime();
  
  setTimeout(() => {
    if (!dragMeta.isPointerDown) return;
    document.body.classList.add('isGrabbing');
    dragMeta.wasDragged = true;
  }, 300);

  if (elem.hasAttribute('EdgeLeft')) {
    dragMeta.startOffset = event.clientX - currentPointPos.firstX;
    dragMeta.side = 'left';
  } else if (elem.hasAttribute('EdgeRight')) {
    dragMeta.startOffset = event.clientX - currentPointPos.lastX;
    dragMeta.side = 'right';
  } else if (elem.hasAttribute('SelectionBg')) {
    dragMeta.startOffset = event.clientX - currentPointPos.firstX;
    dragMeta.side = 'both';
  }

  elem.onpointermove = emitDrag;
  elem.setPointerCapture(event.pointerId);
}

function emitDrag(event: PointerEvent) {
  const timeSinceStart = new Date().getTime() - dragMeta.startMillis;
  const xDiff = Math.abs(event.clientX - dragMeta.startX);
  const yDiff = Math.abs(event.clientY - dragMeta.startY);
  if (timeSinceStart < 300 && xDiff < 5 && yDiff < 5) return;

  document.body.classList.add('isGrabbing');
  dragMeta.wasDragged = true;

  const fixedX = event.clientX - dragMeta.startOffset;
  
  let firstX = currentPointPos.firstX;
  let lastX = currentPointPos.lastX;

  if (dragMeta.side === 'left') {
    firstX = Math.min(fixedX, lastX - 1);
  } else if (dragMeta.side === 'right') {
    lastX = Math.max(fixedX, firstX + 1);
  } else {
    firstX = fixedX;
    lastX = fixedX + dragMeta.startWidth;
  }

  const leftEvent = new MouseEvent(event.type, { ...event, clientX: firstX, clientY: event.clientY });
  const rightEvent = new MouseEvent(event.type, { ...event, clientX: lastX, clientY: event.clientY });

  emit('move', { left: leftEvent, right: rightEvent });
}

function onPointerUp(event: PointerEvent) {
  const elem = (event.target as HTMLElement);
  elem.onpointermove = null;
  elem.releasePointerCapture(event.pointerId);
  document.body.classList.remove('isGrabbing');

  dragMeta.isPointerDown = false;
  
  if (!dragMeta.wasDragged) {
    emit('openPlayer', { firstIdx: props.config.firstIdx, lastIdx: props.config.lastIdx });
  }
}
</script>

<style lang="scss">
.ChartSelector.Component {
  &:hover {
    [SelectionBg] {
      background: rgba(var(--sam-background-rgb), 0.5);
    }
  }

  [SelectionBorder] {
    @apply absolute left-0 top-0 right-0 bottom-0 border-[7px] rounded z-10 pointer-events-none;
    box-shadow: 1px 1px 1px 2px rgba(0, 0, 0, 0.1), inset 1px 1px 1px 2px rgba(0, 0, 0, 0.1);
    border-color: rgba(30, 41, 59, 0.4);
    &:before {
      @apply absolute border-[5px] rounded z-1 border-white;
      content: '';
      position: absolute;
      top: -6px;
      left: -6px;
      right: -6px;
      bottom: -6px;
      z-index: 0;
    }
  }

  [SelectionBg] {
    @apply absolute top-0 bottom-0 left-0 right-0;
    background: rgba(var(--sam-background-rgb), 0.4);
  }
  [EdgeLeft] {
    @apply absolute top-0 bottom-0 -left-0 w-2 cursor-col-resize z-20;
  }
  [EdgeRight] {
    @apply absolute top-0 bottom-0 -right-0 w-2 cursor-col-resize z-20;
  }
}
</style>