<template>
  <section class="RecoveryPlayback" aria-label="Price and stabilization statistics">
    <div class="SupplyDemand" aria-label="Circulating supply and modeled demand">
      <div v-for="bar in bars" :key="bar.label" class="BarColumn">
        <div class="BarTrack"><div class="BarFill" :style="{ height: `${bar.height}%` }" /><strong>₳{{ compact(bar.value) }}</strong></div>
        <span class="opacity-70">{{ bar.label }}</span>
      </div>
    </div>
    <div class="PriceExplanation">
      <h2>{{ heading }}</h2>
      <p>{{ aboveTarget ? 'Demand exceeds circulating supply. Mining issuance increases supply each day and helps bring the price back down toward target.' : 'The market price reflects supply and demand. When demand falls, reducing the circulating supply by burning excess Argons helps bring the price back up to target.' }}</p>
    </div>
    <dl class="StatTable">
      <div><dt>Target Price</dt><dd>{{ money(target) }}</dd></div>
      <div><dt>{{ aboveTarget ? 'Highest Price' : 'Lowest Price' }}</dt><dd>{{ money(extremePrice) }}</dd></div>
      <div><dt>Current Price</dt><dd>{{ money(current.price) }}</dd></div>
      <div><dt>BTC in Vaults</dt><dd>{{ number(current.bitcoinsRemaining, 3) }} BTC</dd></div>
      <div v-if="aboveTarget"><dt>New BTC In Vaults</dt><dd>{{ number(current.bitcoinsAdded ?? 0, 3) }} BTC</dd></div>
      <div v-if="!aboveTarget"><dt>{{ preview ? 'BTC Required' : 'BTC Used' }}</dt><dd>{{ number(preview ? btcRequired : current.bitcoinsUnlocked, 3) }} BTC</dd></div>
    </dl>
    <dl class="StatTable">
      <div><dt>Time to Restabilize</dt><dd>{{ restabilizationTime }}</dd></div>
      <div><dt>Circulation Supply</dt><dd>{{ number(current.circulation, 0) }}</dd></div>
      <div><dt>Circulation Demand</dt><dd>{{ number(demand, 0) }}</dd></div>
      <div><dt>{{ preview ? aboveTarget ? 'Circulation to Mint' : 'Circulation Excess' : aboveTarget ? 'New Argons Minted' : 'Circulation Burned' }}</dt><dd>{{ number(preview ? imbalance : aboveTarget ? current.argonsMinted ?? 0 : current.argonsBurned, 0) }}</dd></div>
      <div v-if="!aboveTarget"><dt>Burn Capacity of BTC</dt><dd>{{ number(capacity, 0) }}</dd></div>
      <div v-if="aboveTarget"><dt>New Mining Revenue</dt><dd>${{ ((current.miningArgonsMinted ?? 0) * current.price).toLocaleString('en-US', { minimumFractionDigits: (current.miningArgonsMinted ?? 0) * current.price > 1000 ? 0 : 3, maximumFractionDigits: (current.miningArgonsMinted ?? 0) * current.price > 1000 ? 0 : 3 }) }}</dd></div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import Vault from '../engine/Vault';
import { recoveryFrameAt, type RecoveryFrame, type RecoveryResult } from '../lib/RecoveryRunner';

const props = defineProps<{
  frames: RecoveryFrame[];
  result: RecoveryResult | null;
  target: number;
  error: string;
  preview: boolean;
  btcPrice: number;
  paused?: boolean;
  reserveWaitDays?: number;
  explanationPauseHours?: () => number | undefined;
}>();
const emit = defineEmits<{
  sample: [payload: { frame: RecoveryFrame; points: { x: number; y: number }[]; finished: boolean }];
  explanationPause: [];
  reservePause: [];
  bottomPause: [];
  speculativePause: [];
}>();
const current = ref({ ...props.frames[0] });
const startingPrice = computed(() => props.frames[0].price);
const aboveTarget = computed(() => startingPrice.value > props.target);
const extremePrice = computed(() => props.frames.reduce((extreme, frame) => {
  if (frame.time > current.value.time) return extreme;
  return aboveTarget.value ? Math.max(extreme, frame.price) : Math.min(extreme, frame.price);
}, current.value.price));
const demand = computed(() => current.value.circulation * current.value.price / props.target);
const imbalance = computed(() => Math.abs(current.value.circulation - demand.value));
const burnPerBitcoin = computed(() => props.btcPrice / props.target * Vault.calculateUnlockBurnPerBitcoinDollar(current.value.price / props.target));
const btcRequired = computed(() => aboveTarget.value ? imbalance.value * props.target / props.btcPrice : imbalance.value / burnPerBitcoin.value);
const capacity = computed(() => aboveTarget.value ? props.btcPrice / props.target : current.value.bitcoinsRemaining * burnPerBitcoin.value);
const heading = computed(() => Math.abs(current.value.price - props.target) < .001 ? 'Argon’s Price Is Back at Target' : `Argon’s Price Is $${Math.abs(current.value.price - props.target).toFixed(3)} ${aboveTarget.value ? 'Above' : 'Below'} Target`);
const bars = computed(() => {
  const initial = props.frames[0];
  const maximum = Math.max(initial.circulation, initial.circulation * initial.price / props.target, 1);
  return [{ label: 'Supply', value: current.value.circulation, height: current.value.circulation / maximum * 100 }, { label: 'Demand', value: demand.value, height: demand.value / maximum * 100 }];
});
function compact(value: number) { return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value); }
function money(value: number) { return `$${value.toFixed(3)}`; }
watch(() => props.frames, frames => { if (props.preview) current.value = { ...frames[0] }; });

const finished = ref(false);
let animation = 0;
let startedAt = performance.now();
let lastTick = 0;
let lastPaint = 0;
let playhead = 0;
let finalAnchorTime = 0;
let finalAnchorHours = 0;
let finalDuration = 5000;
let explanationShown = false;
let reserveExplanationShown = false;
let bottomExplanationShown = false;
const reserveStallFrame = computed(() => props.frames.find(frame => frame.reserveStall));
const selloffBottomFrame = computed(() => props.frames.find(frame => frame.selloffBottom));
const shownSpeculativeHours = new Set<number>();
let awaitingContinue = false;
watch(() => props.paused, (paused, wasPaused) => {
  if (paused || !wasPaused || !awaitingContinue) return;
  awaitingContinue = false;
  const now = performance.now();
  lastTick = finalAnchorTime = now;
  finalAnchorHours = playhead;
  finalDuration = Math.max(1200, finalDuration);
  animation = requestAnimationFrame(tick);
});
function duration(hours: number) {
  const wholeHours = Math.floor(hours);
  return hours < 48 ? `${wholeHours} ${wholeHours === 1 ? 'hour' : 'hours'}` : `${(hours / 24).toFixed(1)} days`;
}
const restabilizationTime = computed(() => props.preview ? '—'
  : props.error ? 'Unavailable'
  : finished.value && props.result && !props.result.recovered ? 'Unachievable'
  : duration(current.value.elapsedHours));
function number(value: number, digits: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: digits });
}
function visiblePoints(frame: RecoveryFrame) {
  const samples = props.frames.filter(sample => sample.time < frame.time);
  const stride = Math.max(1, Math.ceil(samples.length / 160));
  return [...samples.filter((sample, index) => index % stride === 0 || sample.reserveStall || sample.selloffBottom || sample.sixMonthSelloff || sample.speculativeStarted), frame];
}

watch(() => props.result, result => {
  if (!result) return;
  finalAnchorTime = performance.now();
  finalAnchorHours = playhead;
  const desiredDuration = Math.min(18000, 5000 + Math.log1p(result.elapsedHours) * 800);
  finalDuration = Math.max(1200, desiredDuration - (finalAnchorTime - startedAt));
}, { immediate: true });
function paint() {
  const frame = recoveryFrameAt(props.frames, playhead);
  current.value = frame;
  emit('sample', { frame, points: visiblePoints(frame).map(sample => ({ x: sample.time, y: sample.price })), finished: finished.value });
}
function tick(now: number) {
  if (awaitingContinue || props.paused) return;
  if (props.error) { paint(); return; }
  const dt = Math.max(0, now - lastTick);
  lastTick = now;
  const available = props.frames[props.frames.length - 1].elapsedHours;
  if (props.result) {
    const progress = Math.min(1, (now - finalAnchorTime) / finalDuration);
    playhead = finalAnchorHours + (available - finalAnchorHours) * progress;
    finished.value = progress === 1;
  } else {
    // Play buffered engine samples while the worker computes the remaining path.
    playhead = Math.min(available, playhead + dt / 1000 * 24);
  }
  const pauseHours = props.explanationPauseHours?.()
    ?? (props.result ? available : undefined);
  const flatlineHours = reserveStallFrame.value
    ? reserveStallFrame.value.elapsedHours + Math.ceil((props.reserveWaitDays ?? 3) * 24) : Infinity;
  const deadlineHours = props.frames.find(frame => frame.sixMonthSelloff)?.elapsedHours ?? Infinity;
  const nextReserveHours = Math.min(flatlineHours, deadlineHours);
  const reserveHours = !reserveExplanationShown && Number.isFinite(nextReserveHours) ? nextReserveHours : undefined;
  const bottomHours = !bottomExplanationShown ? selloffBottomFrame.value?.elapsedHours : undefined;
  const speculativeHours = props.frames.find(frame => frame.speculativeStarted
    && !shownSpeculativeHours.has(frame.elapsedHours))?.elapsedHours;
  // Stop at the earliest pending event, even when one animation tick crosses several.
  const pauses = [
    { hours: reserveHours, kind: 'reserve' },
    { hours: !explanationShown ? pauseHours : undefined, kind: 'explanation' },
    { hours: bottomHours, kind: 'bottom' },
    { hours: speculativeHours, kind: 'speculative' },
  ].filter(pause => pause.hours !== undefined && playhead >= pause.hours)
    .sort((a, b) => a.hours! - b.hours!);
  const pause = pauses[0];
  if (pause) {
    playhead = pause.hours!;
    finished.value = false;
    awaitingContinue = true;
    paint();
    if (pause.kind === 'reserve') {
      reserveExplanationShown = explanationShown = true;
      emit('reservePause');
    } else if (pause.kind === 'explanation') {
      explanationShown = true;
      emit('explanationPause');
    } else if (pause.kind === 'bottom') {
      bottomExplanationShown = true;
      emit('bottomPause');
    } else {
      shownSpeculativeHours.add(playhead);
      emit('speculativePause');
    }
    return;
  }
  if (now - lastPaint >= 50 || finished.value) {
    lastPaint = now;
    paint();
  }
  if (!finished.value) animation = requestAnimationFrame(tick);
}
onMounted(() => {
  if (props.preview) return;
  startedAt = lastTick = performance.now();
  paint();
  animation = requestAnimationFrame(tick);
});
onBeforeUnmount(() => cancelAnimationFrame(animation));
</script>

<style scoped>
.RecoveryPlayback { display: grid; grid-template-columns: 1.1fr 1.25fr 1fr 1fr; align-items: end; gap: clamp(24px, 3vw, 64px); color: #535161; font-variant-numeric: tabular-nums; pointer-events: none; }
.SupplyDemand { display: flex; gap: 24px; }
.BarColumn { position: relative; flex: 1; min-width: 0; text-align: center; }
.BarTrack { position: relative; height: clamp(120px, 17vh, 210px); border: 1px solid #dcd6e1; }
.BarFill { position: absolute; inset: auto 1px 0; min-height: 10px; background: #e7e4e9; }
.BarTrack strong { position: absolute; bottom: 12px; left: 0; right: 0; font-size: clamp(20px, 1.7vw, 32px); font-weight: 650; }
.BarColumn > span { position: absolute; top: 100%; left: 0; width: 100%; display: block; margin-top: 6px; color: #9893a3; font-weight: 600; }
.PriceExplanation h2 { margin: 0 0 6px; font-size: clamp(14px, 1.05vw, 19px); font-weight: 650; }
.PriceExplanation p { margin: 0; font-size: clamp(12px, .9vw, 16px); line-height: 1.6; }
.StatTable { margin: 0; min-width: 0; font-size: clamp(11px, .85vw, 15px); }
.StatTable > div { display: flex; justify-content: space-between; gap: 12px; border-top: 1px solid #e3dce8; padding: 9px 0; }
.StatTable > div:last-child { border-bottom: 1px solid #e3dce8; }
.StatTable dt { color: #9893a3; }
.StatTable dd { margin: 0; white-space: nowrap; text-align: right; }
@media (max-width: 1450px) { .RecoveryPlayback { gap: 20px; grid-template-columns: .9fr 1fr 1fr 1fr; } .SupplyDemand { gap: 14px; } .StatTable > div { gap: 6px; padding: 7px 0; } }
</style>
