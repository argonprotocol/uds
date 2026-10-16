<template>
  <aside ref="card" class="StabilizationGuidance" :class="{ Historical: readOnly }" :style="layout" aria-label="Stabilization guidance"
    @pointerdown.stop @pointermove.stop @pointerup.stop @keydown.stop>
    <span class="CardArrow" :class="onRight ? 'ArrowLeft' : 'ArrowRight'" :style="{ top: `${arrowTop}px` }" aria-hidden="true" />
    <template v-if="state === 'ready'">
      <h3>Price Has {{ aboveTarget ? 'Risen' : 'Dropped' }} {{ priceChangePercent.toFixed(2) }}%</h3>

      <template v-if="aboveTarget">
        <p>
          An increase in Argon demand has driven the stablecoin to ${{ Math.abs(frame.price).toFixed(3) }}, which is
          ${{ Math.abs(frame.price - request.rules.usdTargetForArgon).toFixed(3) }} above target. According to the law of
          supply and demand, the market needs an additional {{ circulationToMint.toLocaleString('en-US', { maximumFractionDigits: 0 }) }}
          argons minted into circulation.
        </p>
        <p>Argon's blockchain automatically monitors these price changes and mints new tokens when needed.</p>
        <button v-if="!readOnly" type="button" @click="emit('start')">Activate Argon Minting <ChevronDoubleRightIcon class="inline-block h-4 w-4 align-middle" aria-hidden="true" /></button>
      </template>
      <template v-else>
        <p>
          A decrease in Argon demand has dropped the stablecoin to ${{ Math.abs(frame.price).toFixed(3) }}, which is
          ${{ Math.abs(frame.price - request.rules.usdTargetForArgon).toFixed(3) }} below target. According to the law of
          supply and demand, {{ circulationExcess.toLocaleString('en-US', { maximumFractionDigits: 0 }) }}
          must be removed from circulation to restabilize the price.
        </p>
        <p>Argon's network currently has {{ frame.bitcoinsRemaining.toLocaleString('en-US', { maximumFractionDigits: 3 }) }} BTC liquid locked in its vaults,
        which becomes a massive short against this downturn in price.</p>
        <button v-if="!readOnly" type="button" @click="emit('start')">Activate Bitcoin Shorts <ChevronDoubleRightIcon class="inline-block h-4 w-4 align-middle" aria-hidden="true" /></button>
      </template>
    </template>
    <template v-else-if="state === 'selloff-bottom'">
      <h3>Argon Has Reached Bottom</h3>
      <p>The death-spiral has finished with Argon at a complete collapse of ${{ frame.price.toFixed(3) }}. There is only {{ frame.bitcoinsRemaining.toLocaleString('en-US', { maximumFractionDigits: 3 }) }} of BTC still locked in the vaults,
      but due to Argon's curve algorithm, this is more than enough to restabilize back to target.</p>
      <button v-if="!readOnly" type="button" @click="emit('continue')">Let's Go! <ChevronDoubleRightIcon class="inline-block h-4 w-4 align-middle" aria-hidden="true" /></button>
    </template>
    <template v-else-if="state === 'reserve-stall'">
      <h3>Uh Oh, There Aren't Enough Bitcoins</h3>
      <p>
        There are several scenarios whereby the amount of BTC in the network can get too low. In this case, the price rebound has been
        flat for {{ request.rules.fearSelloffDelayInDays }} days. Let's simulate a market-driven stampede where the crowd loses faith in Argon and a full-on death-spiral
        is triggered.
      </p>
      <button v-if="!readOnly" type="button" @click="emit('continue')">Trigger a Complete Death-Spiral <ChevronDoubleRightIcon class="inline-block h-4 w-4 align-middle" aria-hidden="true" /></button>
    </template>
    <template v-else-if="state === 'explaining'">
      <h3>{{ aboveTarget ? 'New Argons Begin Mining' : 'Bitcoins Begin Unlocking' }}</h3>
      <template v-if="aboveTarget">
        <p>The chain has started minting new Argons and distributing them to miners and new BTC Liquid Locks. The added supply is helping bring the price back down to target.</p>
      </template>
      <template v-else>
        <p>With the Argon below target, Bitcoins unlock at a discount. This requires Bitcoin owners to insert Argons back into the vault. The chain then burns these inserted Argons out of circulation, which helps bring the price up.</p>
      </template>
      <button v-if="!readOnly" type="button" @click="emit('continue')">Continue <ChevronDoubleRightIcon class="inline-block h-4 w-4 align-middle" aria-hidden="true" /></button>
    </template>
    <template v-else-if="state === 'running'">
      <dl>
        <div><dt>Elapsed Time</dt><dd>{{ Math.floor(frame.elapsedHours / 24) }}d, {{ Math.floor(frame.elapsedHours % 24) }}h, {{ Math.floor((frame.elapsedHours % 1) * 60) }}m</dd></div>
        <div><dt>Current Price</dt><dd>${{ frame.price.toFixed(3) }} USD</dd></div>
        <div><dt>{{ aboveTarget ? 'New BTC In Vaults' : 'BTC Used' }}</dt><dd>{{ (aboveTarget ? frame.bitcoinsAdded ?? 0 : frame.bitcoinsUnlocked).toLocaleString('en-US', { maximumFractionDigits: 3 }) }} BTC</dd></div>
        <div><dt>{{ aboveTarget ? 'New Argons Minted' : 'Argons Burned' }}</dt><dd>{{ (aboveTarget ? frame.argonsMinted ?? 0 : frame.argonsBurned).toLocaleString('en-US', { maximumFractionDigits: 0 }) }}</dd></div>
      </dl>
    </template>
    <template v-else>
      <h3>{{ state === 'success' ? 'Stabilization Succeeded!' : 'Restabilization Unachievable' }}</h3>
      <p v-if="state === 'success'">Argon is back at target after less than {{ (Math.ceil(frame.elapsedHours / 24)).toFixed(0) }} days.</p>
      <p v-else>The simulation ended without reaching target. Try adjusting the starting price, circulation, or available BTC.</p>
      <p v-if="aboveTarget">{{ (frame.argonsMinted ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 }) }} new Argons were minted, with miners earning
        ${{ miningRevenue.toLocaleString('en-US', { minimumFractionDigits: miningRevenue > 1000 ? 0 : 3, maximumFractionDigits: miningRevenue > 1000 ? 0 : 3 }) }}. Also, an additional {{ (frame.bitcoinsAdded ?? 0).toLocaleString('en-US', { maximumFractionDigits: 3 }) }} BTC was added to the network.</p>
      <p v-else>With no external capital, the network burned the entire {{ frame.argonsBurned.toLocaleString('en-US', { maximumFractionDigits: 0 }) }} in excess circulation.
        It used {{ frame.bitcoinsUnlocked.toLocaleString('en-US', { maximumFractionDigits: 3 }) }} BTC with {{ frame.bitcoinsRemaining.toLocaleString('en-US', { maximumFractionDigits: 3 }) }} BTC
        still remaining. The network is now ready to grow again.</p>
      <button v-if="!readOnly" type="button" @click="emit('done')">Finish</button>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { ChevronDoubleRightIcon } from '@heroicons/vue/24/outline';
import type { RecoveryFrame, RecoveryRequest } from '../lib/RecoveryRunner';

const props = defineProps<{
  state: string;
  readOnly?: boolean;
  frame: RecoveryFrame;
  request: RecoveryRequest;
  anchor: { x: number; y: number };
  bounds: { left: number; right: number; top: number; bottom: number };
}>();
const emit = defineEmits<{ start: []; continue: []; done: [] }>();
const card = ref<HTMLElement>();
const height = ref(240);
let observer: ResizeObserver | undefined;
const aboveTarget = computed(() => props.request.startingPrice > props.request.rules.usdTargetForArgon);
const miningRevenue = computed(() => (props.frame.miningArgonsMinted ?? 0) * props.frame.price);
const circulationToMint = computed(() => Math.abs(props.frame.circulation - props.frame.circulation * props.frame.price / props.request.rules.usdTargetForArgon));
const circulationExcess = computed(() => Math.abs(props.frame.circulation - props.frame.circulation * props.frame.price / props.request.rules.usdTargetForArgon));
const priceChangePercent = computed(() => Math.abs(props.request.startingPrice / props.request.rules.usdTargetForArgon - 1) * 100);
const width = computed(() => Math.min(350, Math.max(220, props.bounds.right - props.bounds.left - 24)));
const onRight = computed(() => props.anchor.x + width.value + 24 <= props.bounds.right);
const top = computed(() => Math.max(props.bounds.top + 12,
  Math.min(props.anchor.y - height.value / 2,
    props.bounds.bottom - height.value + (['ready', 'running', 'selloff-bottom'].includes(props.state) ? 40 : -12))));
const arrowTop = computed(() => Math.max(16, Math.min(props.anchor.y - top.value, height.value - 16)));
const layout = computed(() => ({ width: `${width.value}px`, top: `${top.value}px`,
  left: `${Math.max(props.bounds.left + 12, Math.min(onRight.value ? props.anchor.x + 20 : props.anchor.x - width.value - 20,
    props.bounds.right - width.value - 12))}px` }));
onMounted(() => {
  observer = new ResizeObserver(() => { height.value = card.value?.offsetHeight ?? 240; });
  if (card.value) observer.observe(card.value);
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<style scoped>
.StabilizationGuidance { position: absolute; z-index: 60; padding: 22px 24px; border: 1px solid #ccc5d1; border-radius: 6px; background: white; box-shadow: 0 2px 6px #33204424; color: #647084; font-size: 14px; line-height: 1.55; pointer-events: auto; }
.StabilizationGuidance.Historical { pointer-events: none; }
h3 { margin: 0 0 10px; color: #969ead; font-size: 17px; font-weight: 650; }
p { margin: 0 0 10px; }
button { margin-top: 6px; min-width: 130px; padding: 8px 20px; border-radius: 5px; background: #9d4ed0; color: white; font-weight: 600; }
button:hover { background: #8538b8; }
button:focus-visible { outline: 3px solid #63298e; outline-offset: 3px; }
dl { margin: 0; }
dl > div { display: flex; justify-content: space-between; gap: 14px; padding: 3px 0; }
dt { color: #9aa2b1; }
dd { margin: 0; white-space: nowrap; font-variant-numeric: tabular-nums; }
.CardArrow { position: absolute; width: 12px; height: 12px; background: white; transform: translateY(-50%) rotate(45deg); }
.ArrowLeft { left: -7px; border-left: 1px solid #ccc5d1; border-bottom: 1px solid #ccc5d1; }
.ArrowRight { right: -7px; border-right: 1px solid #ccc5d1; border-top: 1px solid #ccc5d1; }
</style>
