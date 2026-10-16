<template>
  <div HeaderBar :class="[isReady ? '' : 'pointer-events-none']" class="HEADER COMPONENT flex flex-row pl-4 items-center">
    <div :class="[isRunning ? 'opacity-30' : 'opacity-100']" class="min-w-0 flex flex-row items-center">
      <a href="https://argon.network/" aria-label="Back to Argon Network" title="Back to Argon Network" class="inline-flex items-center min-h-11 mr-1 shrink-0 text-[#73179e]" @click="returnToArgon">
        <ChevronDoubleLeftIcon class="w-8 shrink-0 stroke-1 opacity-40 hover:opacity-100" aria-hidden="true" />
      </a>
      <a Logo href="https://argon.network" class="block w-8 shrink-0 relative top-[1px]"><Logo /></a>
      <div class="ModelSelector min-w-0 relative pl-[10px]" @mouseenter="isModelMenuOpen = true" @mouseleave="isModelMenuOpen = false" @focusin="isModelMenuOpen = true" @focusout="closeModelMenuOnBlur" @keydown.esc.stop.prevent="isModelMenuOpen = false">
        <h1 class="text-2xl font-extralight relative top-[0.5px] text-left py-3 text-slate-600">
          <button type="button" class="ModelSelectorButton flex w-full min-w-0 items-center gap-2 text-left" :aria-expanded="isModelMenuOpen" aria-controls="model-navigation" @click="isModelMenuOpen = true" @keydown.down.prevent="isModelMenuOpen = true">
            <span class="truncate">Ultimate Death Spiral Model</span>
            <ChevronDownIcon class="w-4 h-4 shrink-0" aria-hidden="true" />
          </button>
        </h1>
        <nav v-show="isModelMenuOpen" id="model-navigation" aria-label="Models" class="ModelDropdown absolute left-0 top-full rounded bg-white p-1 font-extralight text-slate-600 shadow-lg ring-1 ring-gray-900/5">
          <a href="https://ege.argon.network/">Exponential Growth Engine Model</a>
          <a href="https://llb.argon.network/">Liquid Locking for Bitcoin Model</a>
        </nav>
      </div>
    </div>
    <div v-if="isReady" class="NetworkStats" aria-label="Network state">
      <div class="StatBox">
        <EditorButton @mouseenter="showStatTooltip($event, 'This is the amount of Argons currently in circulation. Click to adjust.')" @focusin="showStatTooltip($event, 'Argons currently in circulation. Click to adjust.')" @mouseleave="dismissStatTooltip" @focusout="dismissStatTooltip" @click="dismissStatTooltip" @keydown.esc="dismissStatTooltip" id="circulation" type="number" v-model="rules.circulation" :sliderMin="Math.round(mainnetDefaults.circulation)" :sliderMax="5_000_000_000_000">
          <div class="HeaderStat"><strong>{{ compactQuantity(recoveryAmounts?.circulation ?? rules.circulation, 2) }} ARGN</strong><span>Current Circulation</span></div>
        </EditorButton>
        <EditorButton @mouseenter="showStatTooltip($event, 'This is the amount of BTC held in liquid-locking vaults. Click to adjust.')" @focusin="showStatTooltip($event, 'BTC held in liquid-locking vaults. Click to adjust.')" @mouseleave="dismissStatTooltip" @focusout="dismissStatTooltip" @click="dismissStatTooltip" @keydown.esc="dismissStatTooltip" id="bitcoinsInLiquidLocks" type="number" :model-value="lockedBitcoins" @update:modelValue="emit('update:lockedBitcoins', Number($event))" :sliderMin="mainnetDefaults.bitcoinsInLiquidLocks" :sliderMax="21_000_000">
          <div class="HeaderStat"><strong>{{ compactQuantity(recoveryAmounts?.lockedBitcoins ?? lockedBitcoins, 2) }} BTC</strong><span>Locked In Vaults</span></div>
        </EditorButton>
        <EditorButton @mouseenter="showStatTooltip($event, 'This is the maximum BTC that the model is allowed to unlock each hour. Click to adjust.')" @focusin="showStatTooltip($event, 'Maximum BTC that can unlock each hour. Click to adjust.')" @mouseleave="dismissStatTooltip" @focusout="dismissStatTooltip" @click="dismissStatTooltip" @keydown.esc="dismissStatTooltip" id="btcMaxTxnsPerHour" type="number" v-model="rules.btcMaxTxnsPerHour">
          <div class="HeaderStat"><strong>{{ compactQuantity(rules.btcMaxTxnsPerHour) }} BTC</strong><span>Unlockable Per Hour</span></div>
        </EditorButton>
      </div>
      <div class="StatBox PriceStatus" role="status" :class="priceStatusClass">
        <div class="HeaderStat" tabindex="0" @mouseenter="showStatTooltip($event, 'This shows how far the market price is above or below the target price at the current moment.')" @focusin="showStatTooltip($event, 'How far the current market price is above or below the target price.')" @mouseleave="dismissStatTooltip" @focusout="dismissStatTooltip" @keydown.esc="dismissStatTooltip"><strong>{{ priceDifference }}</strong><span>{{ priceStatusLabel }}</span></div>
      </div>
    </div>
    <div class="col-start-3 justify-self-end flex flex-row space-x-1 items-center divide-x-1">
      <div :class="[isRunning ? 'opacity-20' : 'opacity-100']" class="flex flex-row space-x-1 items-center divide-x-1">
        <div class="px-1">
          <div @click="resetToDefault" class="IconWrapper pointer-events-auto" @mouseenter="showTooltip($event, 'Reset to Default')" @mouseleave="hideTooltip">
            <ResetOutlined OutlineIcon class="h-[24px]" />
            <ResetSolid SolidIcon class="h-[24px]" />
          </div>
        </div>

        <div class="px-1">
          <div @click="downloadRawData" class="IconWrapper" @mouseenter="showTooltip($event, 'Download')" @mouseleave="hideTooltip">
            <DownloadOutlined OutlineIcon class="h-[24px]" />
            <DownloadSolid SolidIcon class="h-[24px]" />
          </div>
        </div>

        <div v-if="false" class="px-1 cursor-pointer">
          <div @click="openVideoOverlay()" class="IconWrapper" @mouseenter="showTooltip($event, 'Watch Video')" @mouseleave="hideTooltip">
            <PlayOutlined OutlineIcon class="w-[24px]" />
            <PlaySolid SolidIcon class="w-[24px]" />
          </div>
        </div>

        <MoreInfoMenu ref="moreInfoMenuRef" />

        <div class="px-1 cursor-pointer">
          <a class="IconWrapper" href="https://github.com/argonprotocol/uds" target="_blank" @mouseenter="showTooltip($event, 'Open Codebase')" @mouseleave="hideTooltip">
            <GithubOutlined OutlineIcon class="h-[24px]" @click="" />
            <GithubSolid SolidIcon class="h-[24px]" />
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue';
import { ChevronDoubleLeftIcon, ChevronDownIcon } from '@heroicons/vue/24/outline';
import { storeToRefs } from 'pinia';
import DownloadOutlined from '@/assets/download-outlined.svg';
import DownloadSolid from '@/assets/download-solid.svg';
import GithubOutlined from '@/assets/github-outlined.svg';
import GithubSolid from '@/assets/github-solid.svg';
import Logo from '@/assets/logo.svg';
import ResetOutlined from '@/assets/reset-outlined.svg';
import ResetSolid from '@/assets/reset-solid.svg';
import PlayOutlined from '@/assets/play-outlined.svg';
import PlaySolid from '@/assets/play-solid.svg';
import { useBasicStore } from '../store';
import MoreInfoMenu from './MoreInfoMenu.vue';
import { showTooltip, hideTooltip } from '../lib/TooltipUtils';
import emitter from '../emitters/basic';
import EditorButton from './EditorButton.vue';
import { mainnetDefaults } from '../lib/RulesConfig';

const props = defineProps<{
  lockedBitcoins: number;
  currentPrice: number;
  recoveryAmounts?: { circulation: number; lockedBitcoins: number } | null;
}>();
const emit = defineEmits<{ 'update:lockedBitcoins': [value: number] }>();

const isModelMenuOpen = ref(false);
function closeModelMenuOnBlur(event: FocusEvent) {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) {
    isModelMenuOpen.value = false;
  }
}

const basicStore = useBasicStore();
const { isReady, isRunning, rules } = storeToRefs(basicStore);
const difference = computed(() => props.currentPrice - rules.value.usdTargetForArgon);
const atTarget = computed(() => Math.abs(difference.value) < 0.001);
const priceDifference = computed(() => atTarget.value ? 'AT TARGET' : `${difference.value > 0 ? '+' : '−'}$${Math.abs(difference.value).toFixed(3)}`);
const priceStatusLabel = computed(() => atTarget.value ? 'Market Price' : difference.value > 0 ? 'Above Target' : 'Below Target');
const priceStatusClass = computed(() => atTarget.value ? '' : difference.value > 0 ? 'AboveTarget' : 'BelowTarget');

let describedStat: HTMLElement | null = null;

function showStatTooltip(event: MouseEvent | FocusEvent, label: string) {
  dismissStatTooltip();
  const container = event.currentTarget as HTMLElement;
  const button = container.querySelector('button');
  // An open editing popover supplies its own explanation and controls.
  if (button?.getAttribute('aria-expanded') === 'true') return;
  describedStat = button ?? container;
  describedStat.setAttribute('aria-describedby', 'app-tooltip');
  showTooltip(event, label, { wrap: true });
}

function dismissStatTooltip() {
  describedStat?.removeAttribute('aria-describedby');
  describedStat = null;
  hideTooltip();
}

onBeforeUnmount(dismissStatTooltip);

function compactQuantity(value: number, decimals = 0) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

function returnToArgon(event: MouseEvent) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  try {
    if (new URL(document.referrer).hostname === 'argon.network' && window.history.length > 1) {
      event.preventDefault();
      window.history.back();
    }
  } catch { /* An absent referrer uses the link's Argon homepage destination. */ }
}

async function resetToDefault() {
  await basicStore.resetConfig();
  window.location.reload();
}

function openVideoOverlay() {
  emitter.emit('openVideoOverlay');
}
</script>

<style lang="scss">
  .HEADER.COMPONENT {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    padding-inline: 16px;
    z-index: 1100;
    gap: 16px;
    h1 { font-size: clamp(16px, 1.4vw, 24px); }
    .ModelSelectorButton { cursor: pointer; border-radius: 4px; }
    .ModelSelectorButton:focus-visible { outline: 2px solid #a526df; outline-offset: 4px; }
    .ModelDropdown { font-size: clamp(14px, 1.2vw, 20px); z-index: 3000; width: max-content; max-width: calc(100vw - 32px); }
    .ModelDropdown a { display: block; padding: 8px 12px; border-radius: 3px; }
    .ModelDropdown a:hover, .ModelDropdown a:focus-visible { color: #73179e; background: #FAF4FC; }
    .NetworkStats { display: flex; align-self: flex-start; gap: 10px; margin-bottom: -14px; }
    .StatBox { position: relative; display: flex; align-items: center; justify-content: center; gap: 30px; padding: 10px 24px; min-height: 70px; border-radius: 6px; background: linear-gradient(to bottom, #fff0, #fff 65%); }
    .StatBox::before { content: ''; position: absolute; inset: 0; border: 1px solid #c9c3cd; border-radius: inherit; pointer-events: none; mask-image: linear-gradient(to bottom, transparent, #000 80%); }
    .HeaderStat { text-align: center; white-space: nowrap; }
    .HeaderStat strong { display: block; color: #535161; font-size: 22px; line-height: 1.2; font-weight: 600; font-variant-numeric: tabular-nums; }
    .HeaderStat span { display: block; color: #80798a; font-size: 12px; margin-top: 0; }
    .StatBox button { border-radius: 4px; cursor: pointer; }
    .StatBox button:hover .HeaderStat strong { color: #73179e; }
    .StatBox button:focus-visible { outline: 2px solid #a526df; outline-offset: 4px; }
    .PriceStatus { min-width: 142px; }
    .BelowTarget strong { color: #dc2626; }
    .AboveTarget strong { color: #16a34a; }
    @media (max-width: 1400px) {
      gap: 10px;
      .StatBox { gap: 12px; padding-inline: 10px; }
      .HeaderStat strong { font-size: 20px; }
      .HeaderStat span { font-size: 11px; }
      .PriceStatus { min-width: 120px; }
    }
    &[HeaderBar] {
      border-bottom: 1px solid #b9bcc4;
      box-shadow: 0 1px 0 0 white;
    }

    [Logo] svg path {
      fill: #73179E !important;
    }
    svg[SolidIcon] path {
      fill: #73179E !important;
    }

    .IconWrapper {
      @apply cursor-pointer;
      [SolidIcon] {
        display: none;
      }
      &:hover {
        [OutlineIcon] {
          display: none;
        }
        [SolidIcon] {
          display: block;
        }
      }
    }
  }
</style>
