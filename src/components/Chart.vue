<template>
  <div Wrapper class="grow h-full flex flex-col relative top-1.5">
    <div class="absolute w-full h-full">
      <slot />
      <Charttip :config="tooltipConfig" v-if="!hideTooltip" />
    </div>

    <div ChartWrapper :class="props.isRunning ? 'pointer-events-none' : ''" class="grow relative w-full"
      :style="{ cursor: activePointer !== null ? 'grabbing' : canStartLineDrag ? 'grab' : 'default', touchAction: editableLine ? 'none' : undefined }"
      @pointermove="onLinePointerMove" @pointerleave="onLinePointerLeave"
      @pointerdown="startLineDrag" @pointerup="stopLineDrag"
      @pointercancel="stopLineDrag" @lostpointercapture="stopLineDrag">
      <canvas id="MyChart" ref="chartRef"></canvas>
      <button v-for="(milestone, index) in guidanceMilestones" :key="index" type="button"
        class="RecoveryMarker GuidanceDot" :aria-label="`Review: ${milestone.entry.state.replaceAll('-', ' ')}`"
        :style="{ left: `${milestone.x}px`, top: `${milestone.y}px` }"
        @pointerenter="hoveredGuidanceIndex = index" @pointerleave="hoveredGuidanceIndex = null"
        @focus="focusedGuidanceIndex = index" @blur="focusedGuidanceIndex = null"
        @pointerdown.stop @pointermove.stop @pointerup.stop @keydown.stop />
      <button v-for="milestone in speculativeMilestones" :key="`speculative-${milestone.frame.time}`"
        type="button" class="RecoveryMarker GuidanceDot" aria-label="Review speculative demand"
        :style="{ left: `${milestone.x}px`, top: `${milestone.y}px` }"
        @pointerenter="selectedSpeculativeTime = milestone.frame.time" @pointerleave="selectedSpeculativeTime = null"
        @focus="selectedSpeculativeTime = milestone.frame.time" @blur="selectedSpeculativeTime = null"
        @click.stop="selectedSpeculativeTime = milestone.frame.time"
        @pointerdown.stop @pointermove.stop @pointerup.stop @keydown.stop />
      <div v-if="startingPointTooltipVisible && !reviewGuidance" ref="startingPointTooltip" class="StartingPointTooltip" role="tooltip" :style="startingPointTooltipLayout">
        <span class="StartingPointArrow" :class="startingPointTooltipOnRight ? 'ArrowLeft' : 'ArrowRight'" aria-hidden="true" />
        <dl>
          <div><dt>Current Price</dt><dd>${{ pivotPrice.toFixed(3) }}</dd></div>
          <div><dt>Current Circulation</dt><dd>{{ guidanceRequest!.rules.circulation.toLocaleString('en-US', { maximumFractionDigits: 0 }) }}</dd></div>
          <div><dt>BTC Locked</dt><dd>{{ guidanceRequest!.lockedBitcoins.toLocaleString('en-US', { maximumFractionDigits: 3 }) }} BTC</dd></div>
        </dl>
      </div>
      <StabilizationGuidance v-if="reviewGuidance || (guidanceRequest && guidanceFrame && guidanceState && !['idle', 'done'].includes(guidanceState))"
        :state="reviewGuidance?.entry.state ?? guidanceState!" :frame="reviewGuidance?.entry.frame ?? guidanceFrame!" :request="reviewGuidance?.entry.request ?? guidanceRequest!"
        :readOnly="!!reviewGuidance"
        :anchor="reviewGuidance ?? (guidanceState === 'ready' ? committedPoint : recoveryMarker.ready ? recoveryMarker : committedPoint)"
        :bounds="axisBounds" @start="emit('guidanceStart')" @continue="emit('guidanceContinue')" @done="emit('guidanceDone')" />
      <div v-if="editableLine && hintPoint.ready && !props.recoverySample && dragFadeProgress < 0.25" class="DragHints"
        :style="hintLayout">
        <div class="HintAbove">
          <p>Drag the price downward to see what happens<br />when demand falls below supply.</p>
          <svg class="HintArrow" viewBox="0 0 32 48" aria-hidden="true"><path d="M9 1H23V25H31L16 47L1 25H9Z" /></svg>
        </div>
        <div class="HintBelow">
          <div class="UpwardArrow"><svg class="HintArrow" viewBox="0 0 32 48" aria-hidden="true"><path d="M9 1H23V25H31L16 47L1 25H9Z" /></svg></div>
          <p>Drag the price upward to see what<br />happens when demand rises above supply.</p>
        </div>
      </div>
      <template v-if="editableLine && gripper.ready && (activePointer !== null || hasBeenDragged)">
        <div class="PriceGuide" :style="{ opacity: bottomPriceOpacity * 0.5, left: `${axisBounds.left}px`, width: `${axisBounds.right - axisBounds.left}px`, top: `${priceGuideY}px` }" aria-hidden="true" />
        <div class="AxisPriceLabel" :style="{ ...axisPriceTypography, opacity: axisPriceOpacity, width: `${axisPriceRight}px`, top: `${priceGuideY}px` }">
          {{ gripperPrice.toFixed(gripperPrice < 0.01 ? 3 : 2) }}
        </div>
      </template>
      <div v-if="editableLine && hintPoint.ready && !hasBeenDragged"
        class="MARKER HoverMarker" aria-hidden="true"
        :style="{ left: `${hintPoint.x}px`, top: `${hintPoint.y}px` }" />
      <button v-if="editableLine && gripper.ready && (hoverVisible || activePointer !== null || gripperPrice !== baselinePrice)" type="button" role="slider"
        :aria-label="`Argon price on ${dayjs.utc(hoverTime).format('MMMM D, YYYY')}`" :aria-valuemin="minimumPrice" :aria-valuemax="maximumDragPrice"
        :aria-valuenow="hoverPrice" :aria-valuetext="`$${hoverPrice.toFixed(hoverPrice < 0.01 ? 3 : 2)}, ${priceChangePct > 0 ? 'up' : 'down'} ${Math.abs(priceChangePct).toFixed(1)} percent`"
        class="LineGripper" :class="{ dragging: activePointer !== null, Snapped: snappedDot !== null, Pulsating: hoverPrice !== baselinePrice && activePointer !== null, 'opacity-40': pointerOutsideStartRange && activePointer === null }"
        :style="{ left: `${gripper.x}px`, top: `${gripper.y}px` }"
        @keydown="onGripperKeyDown" />
      <div v-if="editableLine && pivotPoint.ready" class="RecoveryMarker" :class="{ Snapped: snappedDot === 'pivot' }"
        aria-hidden="true" :style="{ left: `${pivotPoint.x}px`, top: `${pivotPoint.y}px` }" />
      <div v-if="editableLine && committedPoint.ready && (activePointer === null || draggingPivot) && gripperPrice !== baselinePrice"
        class="RecoveryMarker" :class="{ Pulsating: !recoveryMarker.ready, Snapped: snappedDot === 'grip' }" aria-hidden="true"
        :style="{ left: `${committedPoint.x}px`, top: `${committedPoint.y}px` }" />
      <div v-if="editableLine && recoveryMarker.ready && (activePointer === null || draggingPivot)" class="RecoveryMarker Pulsating"
        :class="{ working: props.recoveryPlaying, Snapped: snappedDot === 'recovery' }" aria-hidden="true"
        :style="{ left: `${recoveryMarker.x}px`, top: `${recoveryMarker.y}px` }" />
    </div>

    <div v-if="markerPos.show" StartMarker class="MARKER cursor-pointer" :style="`left: ${markerPos.left}px; top: ${markerPos.top}px`"></div>

    <XAxis :phases="xAxisPhases" @phaseenter="onPhaseEnter" @phaseleave="onPhaseLeave" @phaseclick="onPhaseClick" :startingTime="chartStart()" :endingTime="chartEnd()" :plotLeft="axisBounds.left" :plotRight="axisBounds.right" :loadPct="loadPct" :getPointPosition="getPointPosition" class="relative mb-4 -top-0.5" />
  </div>
</template>

<script setup lang="ts">
import StabilizationGuidance from './StabilizationGuidance.vue';
import { recoveryFrameAt, type RecoveryFrame, type RecoveryRequest } from '../lib/RecoveryRunner';
import * as Vue from 'vue';
import dayjs from 'dayjs';
import dayjsUtc from 'dayjs/plugin/utc';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, TimeScale, Tooltip, TooltipModel, ChartEvent, InteractionItem } from 'chart.js';
import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm';
import XAxis from '../components/XAxis.vue';
import Charttip from '../overlays/Charttip.vue';
import { createChartOptions } from '../lib/ChartOptions';
import emitter from '../emitters/basic';
import { useBasicStore } from '../store';

dayjs.extend(dayjsUtc);
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, TimeScale, Tooltip);

const props = defineProps<{ 
  xAxisPhases: any[],
  startingYear?: number,
  startingTime?: number,
  endingYear?: number,
  endingTime?: number,
  isRunning?: boolean,
  hideTooltip?: boolean,
  recoveryPoints?: { x: number, y: number }[],
  recoveryFrames?: RecoveryFrame[];
  recoveryCursor?: { x: number, y: number },
  recoveryPlaying?: boolean,
  reserveStall?: RecoveryFrame;
  recoverySample?: { price: number, circulation: number },
  guidanceState?: string;
  guidanceFrame?: RecoveryFrame;
  guidanceRequest?: RecoveryRequest | null;
  guidanceHistory?: { state: string; frame: RecoveryFrame; request: RecoveryRequest }[];
  allowTargetExtension?: boolean;
}>();

const emit = defineEmits(['dragging', 'recoveryRequested', 'mintingRequested', 'recoveryCancelled', 'priceChanged', 'targetPositionChanged', 'dragFadeChanged', 'guidanceStart', 'guidanceContinue', 'guidanceDone']);
const basicStore = useBasicStore();

const startingYear = Vue.computed(() => props.startingYear ?? 2025);
const endingYear = Vue.computed(() => props.endingYear ?? 2125);
const axisBounds = Vue.ref({ left: 0, right: 0, top: 0, bottom: 0 });
const chartWindowOffset = Vue.ref(0);
const chartWindowExtension = Vue.ref(0);
const originalChartStart = () => props.startingTime ?? Date.UTC(startingYear.value, 0, 1);
const originalChartEnd = () => props.endingTime ?? Date.UTC(endingYear.value, 0, 1);
const chartStart = () => originalChartStart() + chartWindowOffset.value;
const chartEnd = () => originalChartEnd() + chartWindowOffset.value + chartWindowExtension.value;

const shadowSelector = Vue.ref({ firstIdx: 0, lastIdx: 0, isActive: false });
const mainSelector = Vue.ref({ firstIdx: 0, lastIdx: 0 });

const hideTooltip = Vue.ref(props.hideTooltip);
const defaultMarkerOpacity: Vue.Ref<number> = Vue.ref(1);
const mainSelectorEnabled = Vue.ref(true);

const totalDays = (chartEnd() - chartStart()) / 86_400_000;
const loadPct = Vue.ref(0);

const markerPos = Vue.ref({ show: false, left: 0, top: 0 });

const chartRef = Vue.ref<HTMLCanvasElement | null>(null);
let chart: Chart | null = null;

const chartPoints: any[] = [];
const pointRadius: number[] = [];
const pointItems: any[] = [];

const dollarPoints: any[] = [];
const dollarPointRadius: any[] = [];

// The editable baseline is UI geometry, independent of simulation markers.
const editableLine = Vue.computed(() => !!props.hideTooltip && !props.isRunning);
const baselinePrice = basicStore.rules.usdTargetForArgon;
const minimumPrice = 0.001;
const maximumDragPrice = 1.75;
const minimumDragRightOffset = 150;
const maximumPrice = Math.max(2, baselinePrice * 2);
const gripperPrice = Vue.ref(baselinePrice);
const gripper = Vue.ref({ x: 0, y: 0, ready: false });
const committedPoint = Vue.ref({ x: 0, y: 0, ready: false });
const pivotPoint = Vue.ref({ x: 0, y: 0, ready: false });
const snappedDot = Vue.ref<'today' | 'pivot' | 'grip' | 'recovery' | null>(null);
const startingPointTooltipVisible = Vue.computed(() => editableLine.value && pivotPoint.value.ready
  && snappedDot.value === 'pivot' && activePointer.value === null && !!props.guidanceRequest);
const startingPointTooltip = Vue.ref<HTMLElement | null>(null);
const startingPointTooltipOnRight = Vue.computed(() => pivotPoint.value.x - 290 < axisBounds.value.left + 12);
const startingPointTooltipLayout = Vue.computed(() => {
  const bounds = axisBounds.value;
  const width = Math.min(270, Math.max(0, bounds.right - bounds.left - 24));
  const height = startingPointTooltip.value?.offsetHeight ?? 100;
  const top = Math.max(bounds.top + 12, Math.min(pivotPoint.value.y - height / 2, bounds.bottom - height - 12));
  return {
    width: `${width}px`,
    left: `${Math.max(bounds.left + 12, Math.min(startingPointTooltipOnRight.value ? pivotPoint.value.x + 20 : pivotPoint.value.x - width - 20, bounds.right - width - 12))}px`,
    top: `${top}px`,
    '--arrow-top': `${Math.max(16, Math.min(pivotPoint.value.y - top, height - 16))}px`,
  };
});
let draggingPivot = false;
const activePointer = Vue.ref<number | null>(null);
const recoveryMarker = Vue.ref({ x: 0, y: 0, ready: false });
const speculativeMilestones = Vue.shallowRef<{ frame: RecoveryFrame; x: number; y: number }[]>([]);
const selectedSpeculativeTime = Vue.ref<number | null>(null);
const speculativeReview = Vue.computed(() => {
  if (activePointer.value !== null || !props.guidanceRequest ||
    (props.guidanceState && !['idle', 'running', 'done'].includes(props.guidanceState))) return;
  const milestone = speculativeMilestones.value.find(point => point.frame.time === selectedSpeculativeTime.value);
  if (!milestone) return;
  return { x: milestone.x, y: milestone.y,
    entry: { state: 'speculative-demand', frame: milestone.frame, request: props.guidanceRequest } };
});
const guidanceMilestones = Vue.shallowRef<{ entry: NonNullable<typeof props.guidanceHistory>[number]; x: number; y: number }[]>([]);
const hoveredGuidanceIndex = Vue.ref<number | null>(null);
const focusedGuidanceIndex = Vue.ref<number | null>(null);
const historicalGuidance = Vue.computed(() => {
  if (activePointer.value !== null) return;
  const index = hoveredGuidanceIndex.value ?? focusedGuidanceIndex.value;
  if (index === null) return;
  const milestone = guidanceMilestones.value[index];
  if (!milestone) return;
  const currentFrame = props.guidanceFrame;
  // Keep the active card's controls available at its own dot.
  if (milestone.entry.state === props.guidanceState && milestone.entry.frame.time === currentFrame?.time) return;
  return milestone;
});
const recoveryHoverPoint = Vue.shallowRef<{ time: number; x: number; y: number } | null>(null);
const lineGuidance = Vue.computed(() => {
  const point = recoveryHoverPoint.value;
  const frames = props.recoveryFrames;
  if (!point || !frames?.length || !props.guidanceRequest || activePointer.value !== null ||
    hoveredGuidanceIndex.value !== null || focusedGuidanceIndex.value !== null ||
    selectedSpeculativeTime.value !== null) return;
  const frame = recoveryFrameAt(frames, (point.time - frames[0].time) / 3_600_000);
  return { x: point.x, y: point.y, entry: { state: 'running', frame, request: props.guidanceRequest } };
});
const reviewGuidance = Vue.computed(() => props.guidanceState === 'speculative-demand'
  ? undefined : speculativeReview.value ?? historicalGuidance.value ?? lineGuidance.value);
Vue.watch(() => props.guidanceRequest, () => { recoveryHoverPoint.value = null; selectedSpeculativeTime.value = null; });
Vue.watch(() => props.guidanceHistory, () => {
  hoveredGuidanceIndex.value = focusedGuidanceIndex.value = null;
  if (chart) positionHover(chart);
});
let dragFrame = 0;
function scheduleDragDraw() {
  if (dragFrame) return;
  dragFrame = requestAnimationFrame(() => {
    dragFrame = 0;
    updateEditableLine();
  });
}
const hoverVisible = Vue.ref(false);
const pointerOutsideStartRange = Vue.ref(false);
const hasBeenDragged = Vue.ref(false);
const dragFadeProgress = Vue.ref(0);
function setDragFadeDistance(distance: number) {
  dragFadeProgress.value = Math.min(1, Math.abs(distance) / 20);
  emit('dragFadeChanged', dragFadeProgress.value);
}
const attentionPoint = Vue.ref({ x: 0, y: 0, ready: false });
const today = dayjs();
const attentionTime = Date.UTC(today.year(), today.month(), today.date());
const hoverTime = Vue.ref(Math.max(chartStart(), Math.min(attentionTime, chartEnd())));
const hoverPrice = Vue.ref(baselinePrice);
const hoverLinePoint = Vue.ref({ x: 0, y: 0, ready: false });
const hoverLinePrice = Vue.ref(baselinePrice);
const hoveringAtTarget = Vue.computed(() => hoverVisible.value && activePointer.value === null
  && Math.abs(hoverLinePrice.value - baselinePrice) < 0.000001);
const hintPoint = Vue.computed(() => activePointer.value !== null && !draggingPivot
  ? { ...gripper.value, y: attentionPoint.value.y }
  : hoveringAtTarget.value ? hoverLinePoint.value : attentionPoint.value);
const hintViewport = Vue.ref({ chartLeft: 0, width: 0 });
function updateHintViewport() {
  if (!chartRef.value) return;
  hintViewport.value = {
    chartLeft: chartRef.value.getBoundingClientRect().left,
    width: document.documentElement.clientWidth,
  };
}
const hintLayout = Vue.computed(() => {
  const margin = 12;
  const width = Math.min(440, Math.max(0, hintViewport.value.width - margin * 2));
  const viewportX = hintViewport.value.chartLeft + hintPoint.value.x;
  const center = Math.max(margin + width / 2,
    Math.min(viewportX, hintViewport.value.width - margin - width / 2));
  return {
    opacity: Math.max(0, 1 - dragFadeProgress.value * 4),
    width: `${width}px`,
    left: `${hintPoint.value.x}px`,
    '--hint-text-offset': `${center - viewportX}px`,
    top: `${hintPoint.value.y}px`,
  };
});
const priceChangePct = Vue.computed(() => (gripperPrice.value / baselinePrice - 1) * 100);
Vue.watch([gripperPrice, () => props.recoverySample, activePointer], () => {
  emit('priceChanged', (activePointer.value === null || draggingPivot) && props.recoverySample ? props.recoverySample.price : gripperPrice.value);
});
const priceGuideY = Vue.ref(0);
const axisPriceTypography = Vue.ref<Record<string, string | number>>({});
const axisPriceOpacity = Vue.ref(0);
const bottomPriceOpacity = Vue.ref(1);
const axisPriceRight = Vue.ref(0);
let pointerOffsetY = 0;
let pointerOffsetX = 0;
let dragMinimumTime = attentionTime;
let pivot = chartStart();
let grip = hoverTime.value;
let pivotPrice = baselinePrice;
let hasPivot = false;
let leftPoints = [{ x: chartStart(), y: baselinePrice }];
const canStartLineDrag = Vue.computed(() => hoverVisible.value &&
  (!hasBeenDragged.value || hoverTime.value > pivot || snappedDot.value === 'pivot'));

function linePriceAt(time: number) {
  const points = chart?.data.datasets[0].data as { x: number, y: number }[] | undefined;
  if (!points?.length) return baselinePrice;
  for (let i = 1; i < points.length; i++) {
    if (time <= points[i].x) {
      const a = points[i - 1], b = points[i];
      const t = b.x === a.x ? 0 : Math.max(0, Math.min(1, (time - a.x) / (b.x - a.x)));
      return a.y + t * (b.y - a.y);
    }
  }
  return points[points.length - 1].y;
}

function positionHover(instance: Chart) {
  updateHintViewport();
  if (activePointer.value === null) setDragFadeDistance(
    instance.scales.y.getPixelForValue(gripperPrice.value) - instance.scales.y.getPixelForValue(baselinePrice));
  priceGuideY.value = instance.scales.y.getPixelForValue(gripperPrice.value);
  const tickFont = instance.scales.y.options.ticks.font as Partial<typeof Chart.defaults.font> | undefined;
  const font = { ...Chart.defaults.font, ...tickFont };
  const lineHeight = typeof font.lineHeight === 'number' ? font.size * font.lineHeight : font.size * 1.2;
  const { ticks, grid } = instance.scales.y.options;
  axisPriceRight.value = instance.scales.y.right - (grid.drawTicks ? grid.tickLength : 0) - ticks.padding;
  axisPriceTypography.value = {
    fontFamily: font.family,
    fontSize: `${font.size}px`,
    fontWeight: font.weight ?? 'normal',
    lineHeight: `${lineHeight}px`,
  };
  const distance = Math.abs(priceGuideY.value - instance.scales.y.getPixelForValue(baselinePrice));
  const bottomDistance = instance.chartArea.bottom - priceGuideY.value;
  bottomPriceOpacity.value = Math.max(0, Math.min(1, (bottomDistance - lineHeight * 0.5) / lineHeight));
  axisPriceOpacity.value = bottomPriceOpacity.value * Math.max(0, Math.min(1, (distance - lineHeight * 0.5) / (lineHeight * 0.5)));
  recoveryMarker.value = props.recoveryCursor ? {
    x: instance.scales.x.getPixelForValue(targetLineHead ?? props.recoveryCursor.x),
    y: instance.scales.y.getPixelForValue(props.recoveryCursor.y), ready: true,
  } : { x: 0, y: 0, ready: false };
  speculativeMilestones.value = (props.recoveryFrames ?? []).filter(frame => frame.speculativeStarted
    && frame.time <= (props.recoveryCursor?.x ?? -Infinity)).map(frame => ({
      frame, x: instance.scales.x.getPixelForValue(frame.time), y: instance.scales.y.getPixelForValue(frame.price),
    })).filter(point => point.x >= instance.chartArea.left && point.x <= instance.chartArea.right);
  guidanceMilestones.value = (props.guidanceHistory ?? []).filter(entry => entry.state !== 'speculative-demand').map(entry => ({
    entry, x: instance.scales.x.getPixelForValue(entry.frame.time),
    y: instance.scales.y.getPixelForValue(entry.frame.price),
  }));
  attentionPoint.value = {
    x: instance.scales.x.getPixelForValue(attentionTime),
    y: instance.scales.y.getPixelForValue(baselinePrice),
    ready: attentionTime >= chartStart() && attentionTime <= chartEnd(),
  };
  const showCommittedPoint = !hoverVisible.value && activePointer.value === null && hasPivot;
  pivotPoint.value = {
    x: instance.scales.x.getPixelForValue(pivot),
    y: instance.scales.y.getPixelForValue(pivotPrice), ready: hasPivot,
  };
  committedPoint.value = {
    x: instance.scales.x.getPixelForValue(grip),
    y: instance.scales.y.getPixelForValue(gripperPrice.value),
    ready: hasPivot,
  };
  gripper.value = {
    x: instance.scales.x.getPixelForValue(showCommittedPoint ? grip : hoverTime.value),
    y: instance.scales.y.getPixelForValue(showCommittedPoint ? gripperPrice.value : hoverPrice.value),
    ready: true,
  };
}

let targetLineFrame = 0;
let targetLineStart: number | null = null;
let targetLineHead: number | null = null;
let targetLineStartedAt = 0;
function resetTargetLineAnimation() {
  cancelAnimationFrame(targetLineFrame);
  targetLineFrame = 0;
  targetLineStart = null;
  targetLineHead = null;
}
function animatedTargetLineEnd(start: number, end: number) {
  if (targetLineStart !== start) {
    resetTargetLineAnimation();
    targetLineStart = start;
    targetLineStartedAt = performance.now();
  }
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1000;
  const progress = duration ? Math.min(1, (performance.now() - targetLineStartedAt) / duration) : 1;
  if (progress < 1 && !targetLineFrame) {
    targetLineFrame = requestAnimationFrame(() => {
      targetLineFrame = 0;
      updateEditableLine();
    });
  }
  targetLineHead = start + (end - start) * progress;
  return targetLineHead;
}

function updateEditableLine() {
  if (!chart || !editableLine.value) return;
  const cursorTime = props.recoveryCursor?.x ?? originalChartEnd();
  const stabilized = props.allowTargetExtension !== false && !props.recoveryPlaying && props.recoveryCursor &&
    Math.abs(props.recoveryCursor.y - baselinePrice) < 0.001;
  const targetLinePadding = stabilized ? 3 * 86_400_000 : 0;
  const tailEnd = Math.min(originalChartEnd() + Math.max(0, grip - originalChartStart()),
    Math.max(originalChartEnd(), cursorTime + targetLinePadding));
  const tailHead = stabilized && props.recoveryPoints?.length && cursorTime < tailEnd
    ? animatedTargetLineEnd(cursorTime, tailEnd) : null;
  const longRecovery = props.guidanceRequest &&
    props.guidanceRequest.startingPrice < baselinePrice &&
    cursorTime > props.guidanceRequest.startingTime + 30 * 86_400_000;
  const extension = longRecovery
    ? Math.max(0, Math.min(cursorTime + targetLinePadding, props.guidanceRequest!.endingTime) - originalChartEnd()) : 0;
  const offset = !longRecovery && props.recoveryPoints?.length
    ? Math.max(0, Math.min((tailHead ?? cursorTime) - originalChartEnd(), grip - originalChartStart())) : 0;
  if (offset !== chartWindowOffset.value || extension !== chartWindowExtension.value) {
    chartWindowOffset.value = offset;
    chartWindowExtension.value = extension;
    chart.options.scales!.x!.min = chartStart();
    chart.options.scales!.x!.max = chartEnd();
  }
  const isOffBaseline = gripperPrice.value !== baselinePrice;
  const transition = [];
  if (hasPivot && isOffBaseline) {
    for (let step = 1; step < 24; step++) {
      const t = step / 24;
      const smooth = t * t * (3 - 2 * t);
      transition.push({ x: pivot + (grip - pivot) * t,
        y: pivotPrice + (gripperPrice.value - pivotPrice) * smooth });
    }
  }
  const points = hasPivot ? [
    ...leftPoints, { x: pivot, y: pivotPrice }, ...transition,
    { x: grip, y: gripperPrice.value },
  ] : [{ x: chartStart(), y: baselinePrice }, { x: chartEnd(), y: baselinePrice }];
  if (hasPivot && !isOffBaseline && grip < chartEnd()) points.push({ x: chartEnd(), y: baselinePrice });
  const showRecovery = hasPivot && (activePointer.value === null || draggingPivot) && !!props.recoveryPoints?.length;
  let extendingTargetLine = false;
  if (showRecovery) {
    points.push(...props.recoveryPoints!.filter(point => point.x > grip));
    const last = points[points.length - 1];
    if (tailHead !== null && Math.abs(last.y - baselinePrice) < 0.001) {
      extendingTargetLine = true;
      points.push({ x: tailHead, y: last.y });
    }
  }
  if (!extendingTargetLine) resetTargetLineAnimation();
  chart.data.datasets[0].data = points;
  Object.assign(chart.data.datasets[0], {
    borderWidth: 6, borderColor: '#63298E',
    segment: { borderWidth: 6, borderColor: '#63298E' },
    pointRadius: 0,
    tension: 0, clip: 0,
  });
  chart.update('none');
}

function trackLineHover(event: PointerEvent) {
  if (!chart || !chartRef.value || !editableLine.value) return;
  const rect = chartRef.value.getBoundingClientRect();
  updateHintViewport();
  const x = event.clientX - rect.left, y = event.clientY - rect.top;
  const area = chart.chartArea;
  const minimumStartX = area.left;
  const maximumStartX = area.right;
  pointerOutsideStartRange.value = x < minimumStartX || x > maximumStartX;
  const time = chart.scales.x.getValueForPixel(x);
  const candidates: { id: NonNullable<typeof snappedDot.value>; time: number; price: number }[] = [];
  if (!hasBeenDragged.value && attentionPoint.value.ready) candidates.push({ id: 'today', time: attentionTime, price: baselinePrice });
  if (hasPivot) candidates.push({ id: 'pivot', time: pivot, price: pivotPrice }, { id: 'grip', time: grip, price: gripperPrice.value });
  if (props.recoveryCursor) candidates.push({ id: 'recovery', time: targetLineHead ?? props.recoveryCursor.x, price: props.recoveryCursor.y });
  const nearest = candidates.map(point => ({ ...point, distance: Math.hypot(
    x - chart.scales.x.getPixelForValue(point.time), y - chart.scales.y.getPixelForValue(point.price),
  ) })).filter(point => point.distance <= 10).sort((a, b) => a.distance - b.distance)[0];
  snappedDot.value = nearest?.id ?? null;
  if (time === undefined || (!nearest && (x < area.left || x > area.right))) {
    hoverVisible.value = false;
    positionHover(chart);
    return;
  }
  const selectedTime = nearest?.time ?? time;
  const price = nearest?.price ?? linePriceAt(selectedTime);
  const points = chart.data.datasets[0].data as { x: number, y: number }[];
  const onDrawnLine = time <= points[points.length - 1].x && Math.abs(y - chart.scales.y.getPixelForValue(linePriceAt(time))) <= 40;
  const beforeFirstDot = hasBeenDragged.value && selectedTime <= pivot && nearest?.id !== 'pivot';
  hoverVisible.value = !beforeFirstDot && (!!nearest || onDrawnLine);
  if (!hoverVisible.value) {
    positionHover(chart);
    return;
  }
  hoverTime.value = selectedTime;
  hoverPrice.value = price;
  hoverLinePrice.value = price;
  hoverLinePoint.value = { x: chart.scales.x.getPixelForValue(selectedTime), y: chart.scales.y.getPixelForValue(price), ready: true };
  positionHover(chart);
}

function onLinePointerMove(event: PointerEvent) {
  recoveryHoverPoint.value = null;
  if (activePointer.value !== null) { moveLineDrag(event); return; }
  trackLineHover(event);
  if (!chart || !chartRef.value || !hoverVisible.value || !props.recoveryFrames?.length || !props.recoveryCursor) return;
  const rect = chartRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left, y = event.clientY - rect.top;
  const time = chart.scales.x.getValueForPixel(x);
  if (time === undefined || time < props.recoveryFrames[0].time || time > props.recoveryCursor.x) return;
  const lineY = chart.scales.y.getPixelForValue(linePriceAt(time));
  if (Math.abs(y - lineY) <= 10) recoveryHoverPoint.value = { time, x, y: lineY };
}

function onLinePointerLeave() {
  recoveryHoverPoint.value = null;
  pointerOutsideStartRange.value = true;
  if (activePointer.value === null) {
    snappedDot.value = null;
    hoverVisible.value = false;
    if (chart) positionHover(chart);
  }
}

function prepareLineDrag(selectClickedPoint = false) {
  const latestPivotTime = chart!.scales.x.getValueForPixel(chart!.chartArea.right - minimumDragRightOffset)!;
  if (hasPivot) {
    if (selectClickedPoint) {
      const selectedTime = Math.max(chartStart() + 1, hoverTime.value);
      if (selectedTime <= pivot) {
        pivot = Math.min(selectedTime, latestPivotTime);
        pivotPrice = hoverPrice.value;
        const points = chart!.data.datasets[0].data as { x: number, y: number }[];
        leftPoints = points.filter(point => point.x < pivot).map(point => ({ ...point }));
      } else {
        grip = selectedTime;
        gripperPrice.value = hoverPrice.value;
      }
    }
    dragMinimumTime = pivot;
    hoverTime.value = grip;
    hoverPrice.value = gripperPrice.value;
    return;
  }
  grip = Math.max(chartStart() + 1, Math.min(hoverTime.value, latestPivotTime));
  pivot = grip;
  dragMinimumTime = grip;
  pivotPrice = linePriceAt(pivot);
  const points = chart!.data.datasets[0].data as { x: number, y: number }[];
  leftPoints = points.filter(point => point.x < pivot).map(point => ({ ...point }));
  gripperPrice.value = hoverPrice.value;
  hasPivot = true;
}

function startLineDrag(event: PointerEvent) {
  if (!editableLine.value || !chartRef.value || activePointer.value !== null || event.button !== 0) return;
  trackLineHover(event);
  if (!canStartLineDrag.value) return;
  draggingPivot = hasBeenDragged.value && snappedDot.value === 'pivot';
  event.preventDefault();
  emit('recoveryCancelled');
  if (!hasPivot) {
    chart!.data.datasets[0].data = [
      { x: chartStart(), y: baselinePrice }, { x: chartEnd(), y: baselinePrice },
    ];
  }
  if (!draggingPivot) prepareLineDrag(true);
  hasBeenDragged.value = gripperPrice.value !== baselinePrice;
  positionHover(chart!);
  pointerOffsetX = event.clientX - chartRef.value.getBoundingClientRect().left - gripper.value.x;
  pointerOffsetY = event.clientY - chartRef.value.getBoundingClientRect().top - gripper.value.y;
  activePointer.value = event.pointerId;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  updateEditableLine();
}

function moveLineDrag(event: PointerEvent) {
  if (activePointer.value !== event.pointerId || !chart || !chartRef.value) return;
  const rect = chartRef.value.getBoundingClientRect();
  const pointerX = event.clientX - rect.left;
  const area = chart.chartArea;
  pointerOutsideStartRange.value = pointerX < area.left || pointerX > area.right;
  const x = Math.min(event.clientX - rect.left - pointerOffsetX, area.right);
  const y = event.clientY - rect.top - pointerOffsetY;
  const time = chart.scales.x.getValueForPixel(x);
  const price = chart.scales.y.getValueForPixel(y);
  if (price === undefined || time === undefined) return;
  if (draggingPivot) {
    const latestPivotTime = chart.scales.x.getValueForPixel(area.right - minimumDragRightOffset)!;
    pivot = Math.max(chartStart() + 1, Math.min(grip - 1, latestPivotTime, time));
    leftPoints = leftPoints.filter(point => point.x < pivot);
    hoverTime.value = pivot;
    hoverPrice.value = pivotPrice;
    positionHover(chart);
    scheduleDragDraw();
    return;
  }
  setDragFadeDistance(y - chart.scales.y.getPixelForValue(baselinePrice));
  gripperPrice.value = Math.max(minimumPrice, Math.min(maximumDragPrice, price));
  if (baselinePrice <= maximumDragPrice && Math.abs(y - chart.scales.y.getPixelForValue(baselinePrice)) <= 4) gripperPrice.value = baselinePrice;
  const priceLimit = gripperPrice.value < pivotPrice ? minimumPrice : maximumDragPrice;
  const priceRange = Math.abs(priceLimit - pivotPrice);
  const progress = priceRange > 0 ? Math.min(1, Math.abs(gripperPrice.value - pivotPrice) / priceRange) : 0;
  const minimumX = chart.scales.x.getPixelForValue(dragMinimumTime) + minimumDragRightOffset * progress;
  const shiftedTime = chart.scales.x.getValueForPixel(Math.min(area.right, Math.max(x, minimumX)))!;
  grip = Math.max(chartStart() + 1, Math.min(chartEnd(), Math.max(dragMinimumTime, shiftedTime)));
  hoverTime.value = grip;
  hoverPrice.value = gripperPrice.value;
  hasBeenDragged.value = gripperPrice.value !== baselinePrice;
  positionHover(chart);
  scheduleDragDraw();
}

function stopLineDrag(event: PointerEvent) {
  if (activePointer.value !== event.pointerId) return;
  cancelAnimationFrame(dragFrame);
  dragFrame = 0;
  const movedStartingPoint = draggingPivot;
  activePointer.value = null;
  draggingPivot = false;
  const surface = event.currentTarget as HTMLElement;
  if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
  updateEditableLine();
  trackLineHover(event);
  if (event.type === 'pointerup' && !movedStartingPoint) requestPriceEngine();
}

function requestPriceEngine() {
  if (!hasPivot || gripperPrice.value === baselinePrice) return;
  const request = { startingTime: grip, endingTime: chartEnd(), startingPrice: gripperPrice.value };
  if (gripperPrice.value > baselinePrice) emit('mintingRequested', request);
  else emit('recoveryRequested', request);
}

Vue.watch([() => props.recoveryPoints, () => props.recoveryPlaying, () => props.recoveryCursor, () => props.allowTargetExtension, () => props.reserveStall], () => updateEditableLine());

function onGripperKeyDown(event: KeyboardEvent) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  pointerOutsideStartRange.value = false;
  event.preventDefault();
  prepareLineDrag();
  emit('recoveryCancelled');
  const delta = event.shiftKey ? 0.1 : 0.01;
  if (event.key === 'Home') gripperPrice.value = minimumPrice;
  else if (event.key === 'End') gripperPrice.value = maximumDragPrice;
  else gripperPrice.value = Math.max(minimumPrice, Math.min(maximumDragPrice,
    gripperPrice.value + (event.key === 'ArrowDown' ? -delta : delta)));
  if (Math.abs(baselinePrice - gripperPrice.value) < 0.000001) gripperPrice.value = baselinePrice;
  hoverPrice.value = gripperPrice.value;
  hasBeenDragged.value = gripperPrice.value !== baselinePrice;
  updateEditableLine();
  requestPriceEngine();
}

function openPlayer({ firstIdx, lastIdx }: { firstIdx: number, lastIdx: number }) {
  emitter.emit('openPlayer', { items: pointItems, firstIdx, lastIdx });
}

function onPhaseEnter(event: MouseEvent) {
  const phase = (event as any).phase;
  shadowSelector.value.firstIdx = phase.firstItem.idx;
  shadowSelector.value.lastIdx = phase.lastItem.idx;
  shadowSelector.value.isActive = true;
}

function onPhaseLeave(event: any) {
  shadowSelector.value.isActive = false;
}

function onPhaseClick(event: MouseEvent) {
  const phase = (event as any).phase;
  
  let firstIdx = phase.firstItem.idx;
  let lastIdx = phase.lastItem.idx;

  if (event.shiftKey) {
    if (firstIdx < mainSelector.value.firstIdx) {
      lastIdx = mainSelector.value.lastIdx;
    }
    if (lastIdx > mainSelector.value.lastIdx) {
      firstIdx = mainSelector.value.firstIdx;
    }
  }

  setMainSelectorPos(firstIdx, lastIdx);
}

function setMainSelectorPos(firstIdx: number, lastIdx: number) {
  mainSelector.value.firstIdx = firstIdx;
  mainSelector.value.lastIdx = lastIdx;
  mainSelectorEnabled.value = true;
}

function toggleDatasetVisibility(index: number, visible: boolean) {
  const dataset = chart?.data.datasets[index];
  if (dataset) {
    dataset.hidden = !visible;
  }
  chart?.update();
}

function clearPoints() {
  chartPoints.splice(0, chartPoints.length);
  pointRadius.splice(0, pointRadius.length);
  // @ts-ignore
  chart.options.scales.x.max = chartEnd();
  chart?.update();
}

function addPoints(items: { startingDate: string, endingPrice: number, showPointOnChart?: boolean }[]) {
  const lastIndex = chartPoints.length - 1;
  if (lastIndex > 0) {
    pointRadius[lastIndex] = chartPoints[lastIndex].showPointOnChart ? 4 : 0;
  }
  
  for (const item of items) {
    const date = dayjs.utc(item.startingDate);
    const price = item.endingPrice * basicStore.rules.usdTargetForArgon;

    chartPoints.push({ x: date.valueOf(), y: price });
    pointRadius.push(item.showPointOnChart ? 4 : 0);
    pointItems.push(item);
  }
  
  pointRadius[pointRadius.length - 1] = props.hideTooltip ? 0 : 4;

  const daysLoaded = chartPoints.length / totalDays;
  loadPct.value = Math.round(daysLoaded * 100);

  if (!chart) return;
  if (chartPoints[chartPoints.length - 1].x > chartEnd()) {
    // @ts-ignore
    chart.options.scales.x.max = chartPoints[chartPoints.length - 1].x;
  }
  chart.update();
  updateEditableLine();

  const dataset = chart.data.datasets[0];
  const datasetData = dataset.data;
  const currentIndex = datasetData.length - 1;

  const meta = chart?.getDatasetMeta(0);
  const currentDataPoint = meta?.data[currentIndex];

  markerPos.value.left = currentDataPoint?.x || 0;
  markerPos.value.top = currentDataPoint?.y || 0;

  // Trigger tooltip on the latest point
  if (props.isRunning && currentDataPoint && pointItems.length > 10) {
    chart.tooltip.setActiveElements([{ datasetIndex: 0, index: currentIndex }], { x: currentDataPoint.x, y: currentDataPoint.y });
    chart.update();
  }

  return { x: currentDataPoint?.x, y: currentDataPoint?.y };
}

const tooltipOpened = Vue.ref(false);

function reloadData(items: any[], dollarData?: any[]) {
  if (!chart) return;

  chartPoints.splice(0, chartPoints.length);
  pointRadius.splice(0, pointRadius.length);
  pointItems.splice(0, pointItems.length);

  dollarPoints.splice(0, dollarPoints.length);
  dollarPointRadius.splice(0, dollarPointRadius.length);

  const newDollarPoints = dollarData?.map((item: any) => {
    const date = dayjs.utc(item.startingDate);
    const price = Math.min(item.endingPrice, 1.00);
    return { x: date.valueOf(), y: price };
  }) || [];

  dollarPoints.push(...newDollarPoints);
  dollarPointRadius.push(...newDollarPoints.map(() => 0));
  dollarPointRadius[dollarPointRadius.length - 1] = 4;

  addPoints(items);

  chart.update();
}

function getPointPosition(index: number) {
  const meta = chart?.getDatasetMeta(0);
  const currentDataPoint = meta?.data[index];

  return { x: currentDataPoint?.x || 0, y: currentDataPoint?.y || 0 };
}

function getItem(index: number) {
  index = Math.max(0, index);
  index = Math.min(pointItems.length - 1, index);
  return pointItems[index];
}

function getItems(startIndex: number, endIndex: number) {
  return pointItems.slice(startIndex, endIndex);
}

function getLastItem() {
  return pointItems[pointItems.length - 1];
}

function getItemIndexFromEvent(event: MouseEvent) {
  if (!chartRef.value) return;

  const rect = chartRef.value.getBoundingClientRect();
  const maxY = rect.height - rect.top;
  const clientX = event.clientX;
  const clientY = event.clientY;

  const wrappedEvent = { 
    chart: chart,
    native: event,
    offsetX: undefined,
    offsetY: undefined,
    type: event.type,
    x: clientX,
    y: Math.min(clientY, maxY),
  };
  const interactionItems = chart?.getElementsAtEventForMode(wrappedEvent as any, 'index', { intersect: false }, true) || [];
  return interactionItems[0]?.index;
}

function turnOffTooltip(tooltipConfig: any) {
  tooltipConfig.value.opacity = 0;
  defaultMarkerOpacity.value = 1;
}

function turnOnTooltip(tooltipConfig: any, datasetIndex: number) {
  tooltipConfig.value.opacity = 1;

  if (datasetIndex === 0) {
    defaultMarkerOpacity.value = 0.5;
  }
}

function onTooltipFn(tooltip: TooltipModel<any>, closeIfItemMatchesThis?: any) {
  if (tooltipOpened.value) return;
  // Hide if no tooltip
  if (tooltip.opacity === 0 || !tooltip.dataPoints) {
    turnOffTooltip(tooltipConfig);
    return;
  }

  const dataPoint = tooltip.dataPoints[0];
  const pointIndex = dataPoint.dataIndex;
  const datasetIndex = dataPoint.datasetIndex;
  const item = pointItems[pointIndex];

  if (closeIfItemMatchesThis === item) {
    turnOffTooltip(tooltipConfig);
    return;
  }

  tooltipConfig.value.datasetIndex = datasetIndex;
  tooltipConfig.value.item = item;

  // Set caret Position
  if (tooltip.yAlign) {
    tooltipConfig.value.class = tooltip.yAlign; // above or below
  } else {
    tooltipConfig.value.class = 'no-transform';
  }

  turnOnTooltip(tooltipConfig, datasetIndex);
  tooltipConfig.value.left = tooltip.caretX;
  tooltipConfig.value.top = tooltip.caretY;
}

function onEventFn(chart: Chart, args: any, pluginOptions: any) {
  const tooltip = chart.tooltip;
  const event = args.event;
  if (event.type === 'click') {
    if (tooltipOpened.value) {
      tooltipOpened.value = false;
      const item = tooltipConfig.value.item;
      const pointIndex = pointItems.findIndex(x => x === item);
      pointRadius[pointIndex] = item.showPointOnChart ? 4 : 0;
      onTooltipFn(tooltip as any, item);
      chart?.update();
    } else if (tooltip?.opacity) {
      tooltipOpened.value = true;
      const pointIndex = tooltip.dataPoints[0].dataIndex;
      pointRadius[pointIndex] = 4;
      chart?.update();
    }
  }
  if (event.type === 'mousedown') {
    startDrag(event);
  }
}

const dragMeta = { 
  isDragging: false,
  startX: 0 as number,
  startInteractionItem: null as InteractionItem | null,
  startEvent: null as any,
};

function startDrag(event: ChartEvent) {
  const alteredEvent = { ...event };
  alteredEvent.x = Math.max(20, alteredEvent.x as number);
  const interactionItems = chart?.getElementsAtEventForMode(alteredEvent as any, 'index', { intersect: false }, true) || [];
  
  dragMeta.isDragging = true;
  dragMeta.startX = event.x || 0;
  dragMeta.startInteractionItem = interactionItems[0];
  dragMeta.startEvent = event;

  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
}

function onDrag(event: any) {
  if (!dragMeta.isDragging) return;

  const { startX, startInteractionItem } = dragMeta;
  const startIndex = startInteractionItem?.index || 0;
  const alteredEvent = { ...dragMeta.startEvent };
  alteredEvent.x = Math.max(20, event.x as number);
  const interactionItems = chart?.getElementsAtEventForMode(alteredEvent, 'index', { intersect: false }, true) || [];

  const endX = Math.max(20, event.x as number);
  const endInteractionItem = interactionItems[0];
  const endIndex = endInteractionItem.index;
  const leftToRight = endX > startX;

  const left = {
    x: leftToRight ? startInteractionItem?.element.x || 0 : endInteractionItem?.element.x,
    y: leftToRight ? startInteractionItem?.element.y || 0 : endInteractionItem?.element.y,
    index: leftToRight ? startIndex : endIndex,
    item: leftToRight ? pointItems[startIndex] : pointItems[endIndex],
  };
  const right = {
    x: leftToRight ? endInteractionItem?.element.x || 0 : startInteractionItem?.element.x || 0,
    y: leftToRight ? endInteractionItem?.element.y || 0 : startInteractionItem?.element.y || 0,
    index: leftToRight ? endIndex : startIndex,
    item: leftToRight ? pointItems[endIndex] : pointItems[startIndex],
  }

  // Emit the response back to the parent component
  emit('dragging', { left, right });
}

function stopDrag(event: MouseEvent) {
  dragMeta.isDragging = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
}

const tooltipConfig = Vue.ref({
  opacity: 0,
  class: '',
  left: 0,
  top: 0,
  item: {} as any,
  datasetIndex: 0,
});

function startPulsing() {
  markerPos.value.show = true;
}

function stopPulsing() {
  markerPos.value.show = false;
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && event.shiftKey) {
    mainSelectorEnabled.value = false;
  }
}

Vue.onMounted(() => {
  if (chartRef.value) {
    const chartOptions = createChartOptions(chartPoints, pointRadius, dollarPoints, dollarPointRadius, onTooltipFn, onEventFn);
    chartOptions.data.datasets.splice(1, 1);
    chartOptions.options.scales.x.min = chartStart();
    chartOptions.options.scales.x.max = chartEnd();
    chartOptions.plugins.push({
      id: 'customAxisLayout',
      afterLayout: (instance: Chart) => {
        axisBounds.value = { left: instance.chartArea.left, right: instance.chartArea.right,
          top: instance.chartArea.top, bottom: instance.chartArea.bottom };
        emit('targetPositionChanged', instance.scales.y.getPixelForValue(baselinePrice));
        if (editableLine.value) positionHover(instance);
      },
    } as any);
    Object.assign(chartOptions.options.scales.y, {
      display: true,
      min: 0,
      max: maximumPrice,
      afterBuildTicks: (scale: any) => {
        scale.ticks = [0, baselinePrice, maximumPrice].map(value => ({ value }));
      },
      title: { display: false },
      ticks: {
        autoSkip: false,
        color: '#64748b',
        callback: (value: number) => Number(value) === maximumPrice ? '' : Number(value).toFixed(2),
      },
      grid: {
        color: (context: any) => context.tick.value === baselinePrice ? 'rgba(99, 41, 142, 0.3)' : 'transparent',
        lineWidth: 6,
        tickWidth: 1,
      },
      border: { dash: [8, 6] },
    });
    if (props.hideTooltip) chartOptions.options.events = [];
    chart = new Chart(chartRef.value, chartOptions as any);
    updateEditableLine();
  }

  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', updateHintViewport);
});

Vue.onBeforeUnmount(() => {
  resetTargetLineAnimation();
  cancelAnimationFrame(dragFrame);
  if (chart) {
    chart.destroy();
  }

  document.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('resize', updateHintViewport);
});

function getExplanationPauseHours(frames: RecoveryFrame[]): number | undefined {
  if (!chart) return;
  let distance = 0;
  for (let index = 1; index < frames.length; index++) {
    const previous = frames[index - 1], next = frames[index];
    const segment = Math.hypot(
      chart.scales.x.getPixelForValue(next.time) - chart.scales.x.getPixelForValue(previous.time),
      chart.scales.y.getPixelForValue(next.price) - chart.scales.y.getPixelForValue(previous.price),
    );
    if (distance + segment >= 25) {
      return previous.elapsedHours + (next.elapsedHours - previous.elapsedHours) * (25 - distance) / segment;
    }
    distance += segment;
  }
}

defineExpose({
  getExplanationPauseHours,
  addPoints, 
  reloadData, 
  startPulsing, 
  stopPulsing, 
  clearPoints, 
  getItems, 
  getItem, 
  getLastItem, 
  toggleDatasetVisibility,
  getPointPosition,
  setMainSelectorPos,
});
</script>

<style lang="scss" scoped>
.StartingPointTooltip {
  position: absolute;
  z-index: 70;
  padding: 12px 16px;
  border: 1px solid #ccc5d1;
  border-radius: 6px;
  background: white;
  box-shadow: 0 2px 6px #33204424;
  color: #535161;
  font-size: 13px;
  pointer-events: none;
  font-variant-numeric: tabular-nums;
  dl { margin: 0; }
  dl > div { display: flex; justify-content: space-between; gap: 12px; padding: 3px 0; }
  dt { color: #9893a3; }
  dd { margin: 0; white-space: nowrap; }
}
.StartingPointArrow {
  position: absolute;
  top: var(--arrow-top);
  width: 12px;
  height: 12px;
  background: white;
  transform: translateY(-50%) rotate(45deg);
  &.ArrowLeft { left: -7px; border-left: 1px solid #ccc5d1; border-bottom: 1px solid #ccc5d1; }
  &.ArrowRight { right: -7px; border-right: 1px solid #ccc5d1; border-top: 1px solid #ccc5d1; }
}
.DragHints {
  position: absolute;
  width: 440px;
  transform: translateX(-50%);
  text-align: center;
  overflow-wrap: anywhere;
  color: #80798a;
  font-size: clamp(12px, 1vw, 16px);
  line-height: 1.5;
  pointer-events: none;
  opacity: 1;
  transition: left 150ms ease-out, top 150ms ease-out;
}
.HintAbove { position: absolute; bottom: 45px; width: 100%; }
.HintBelow { position: absolute; top: 45px; width: 100%; }
.HintAbove, .HintBelow { animation: hintBounce 7s ease-in-out infinite; }
.HintBelow { --hint-bounce-offset: -8px; }
.HintAbove p, .HintBelow p {
  position: relative;
  left: var(--hint-text-offset, 0px);
  transition: left 150ms ease-out;
}
.HintAbove p { margin-bottom: 14px; }
.HintBelow p { margin-top: 14px; }
.HintArrow { display: block; width: 32px; height: 48px; margin: 0 auto; fill: #d9d9d9; stroke: #bdbdbd; }
.UpwardArrow { transform: rotate(180deg); }
@keyframes hintBounce {
  0%, 72%, 100% { transform: translateY(0); }
  78%, 90% { transform: translateY(var(--hint-bounce-offset, 8px)); }
  84%, 96% { transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .HintAbove, .HintBelow { animation: none; }
  .DragHints { transition: none; }
  .HintAbove p, .HintBelow p { transition: none; }
  .MARKER.HoverMarker { transition: none; }
}

.PriceGuide {
  position: absolute;
  height: 1px;
  background: #94a3b8;
  opacity: 0.5;
  pointer-events: none;
}
.AxisPriceLabel {
  position: absolute;
  left: 0;
  transform: translateY(-50%);
  padding: 0;
  color: #63298e;
  text-align: right;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

.RecoveryMarker, .LineGripper {
  position: absolute;
  box-sizing: border-box;
  width: 12px;
  height: 12px;
  padding: 0;
  border: 1px solid white;
  border-radius: 50%;
  background: #63298e;
  transform: translate(-50%, -50%);
}
.RecoveryMarker {
  pointer-events: none;
  z-index: 22;
}
.GuidanceDot {
  pointer-events: auto;
  cursor: help;
  z-index: 24;
  &::after { content: ''; position: absolute; inset: -7px; border-radius: 50%; }
  &:focus-visible { outline: 3px solid #c084fc; outline-offset: 3px; }
}
.Snapped { box-shadow: 0 0 0 2px #63298e40; }

.LineGripper {
  color: #63298e;
  font-size: 24px;
  line-height: 1;
  cursor: grab;
  touch-action: none;
  user-select: none;
  z-index: 20;
  &.dragging { cursor: grabbing; }
  &:focus-visible { outline: 3px solid #c084fc; outline-offset: 3px; }
}

.HoverMarker {
  transition: left 150ms ease-out, top 150ms ease-out;
}

.MARKER {
  @apply rounded-full bg-[#63298E] absolute z-20 border border-slate-400;
  width: 10px;
  height: 10px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.MARKER, .Pulsating {
  &:before, &:after {
    content: "";
    display: block;
    position: absolute;
    pointer-events: none;
    border: 2px solid #63298E;
    left: -20px;
    right: -20px;
    top: -20px;
    bottom: -20px;
    border-radius: 50%;
    animation: animate 1.5s linear infinite;
    backface-visibility: hidden;
  }

  &:after {
    animation-delay: 0.5s;
  }
}

@keyframes animate {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: scale(1.2);
    opacity: 0;
  }
}
</style>
