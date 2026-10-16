<template>
<div class="EditorButton Component inline-block" ref="elementRef" >
  <Popover v-if="['number', 'percent'].includes(props.type)" v-slot="{ open: isOpen }" class="relative inline-block">
    <PopoverButton ref="buttonRef" as="button" type="button" class="inline-block">
      <slot v-if="$slots.default" :open="isOpen" />
      <div v-else-if="props.type === 'number'" EditButton :class="{ 'showingOverlay': isOpen }" class="inline-block">
        {{ props.label || addCommas(props.modelValue) }}
      </div>
      <div v-else-if="props.type === 'percent'" EditButton :class="{ 'showingOverlay': isOpen }" class="inline-block">
        {{ props.label || `${props.modelValue}%` }}
      </div>
    </PopoverButton>
    <transition @beforeEnter="onOpen" enter-active-class="transition ease-out duration-150" enter-from-class="opacity-0 -translate-y-10" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 -translate-y-10">
      <Teleport to="body">
        <PopoverPanel v-slot="{ close: closeFn }" :style="{ right: rightPx(), top: topPx() }" class="absolute z-[3000] mt-3 flex w-screen max-w-max">
          <div class="absolute top-0.5 right-4 -translate-x-1/2 -translate-y-full">
            <svg class="relative z-10" width="17" height="11" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0L24 12H0L12 0Z" fill="white"/>
            </svg>
            <svg class="absolute z-0 -top-0.5 left-[-0.5px] opacity-[0.05]" width="16" height="10" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0L24 12H0L12 0Z" fill="black"/>
            </svg>
          </div>
          <div class="w-screen max-w-[300px] flex-auto overflow-hidden shadow-lg rounded-md bg-white pl-5 pb-4 pt-5 pr-6 text-left ring-1 ring-gray-900/5">

            <div class="grow">
              
              <div v-if="props.id === 'btcVaultCapacityPct'">
                <label for="btcVaultCapacityPct" class="block text-sm/6 font-medium text-gray-900">Capacity of Argon Vaults</label>
                <div class="relative mt-2 rounded-md shadow-sm">
                  <input type="text" @keydown="handleKeyPress(closeFn, $event)" :value="formattedModel" @input="onQuantityInput" name="btcVaultCapacityPct" id="btcVaultCapacityPct" class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm/6" />
                  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span class="text-gray-500 sm:text-sm" id="price-currency">%</span>
                  </div>
                </div>
                <VueSlider v-model="localModel" tooltip="none" :contained="true" :silent="true" :min="0" :max="100" :marks="capacityMarks" class="mt-3"></VueSlider>
              </div>

              <div v-else-if="props.id === 'btcMaxTxnsPerHour'">
                <label for="btcMaxTxnsPerHour" class="block text-sm/6 font-medium text-gray-900">Max BTC Unlocks Per Hour</label>
                <div class="relative mt-2 rounded-md shadow-sm">
                  <input type="text" @keydown="handleKeyPress(closeFn, $event)" :value="formattedModel" @input="onQuantityInput" name="btcMaxTxnsPerHour" id="btcMaxTxnsPerHour" class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm/6" />
                </div>
              </div>
              <div v-else>
                <label :for="props.id" class="block text-sm/6 font-medium text-gray-900">
                  {{ props.id === 'circulation' ? 'Argons In Circulation' : 'Bitcoins Liquid Locked' }}
                </label>
                <input type="text" inputmode="decimal" :id="props.id" :name="props.id"
                  :value="formattedModel" @input="onQuantityInput" @keydown="handleKeyPress(closeFn, $event)"
                  class="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm" />
              </div>
              <div v-if="editingMin !== undefined && editingMax !== undefined" class="QuantitySlider mt-4">
                <input type="range" min="0" max="1000" step="1" v-model.number="quantitySlider"
                  :aria-label="props.id === 'circulation' ? 'Argons In Circulation' : props.id === 'btcMaxTxnsPerHour' ? 'Max BTC Unlocks Per Hour' : 'Bitcoins Liquid Locked'"
                  :aria-valuetext="formattedModel"
                  class="block w-full cursor-pointer accent-fuchsia-600" />
                <div class="SliderMarks relative text-slate-500">
                  <span v-for="(mark, index) in quantityMarks" :key="mark.value" class="SliderMark absolute"
                    :class="{ FirstMark: index === 0, LastMark: index === quantityMarks.length - 1 }"
                    :style="{ left: `${mark.position / 10}%` }">
                    <span class="MarkTick" aria-hidden="true"></span>
                    {{ compactQuantity(mark.value) }}
                  </span>
                </div>
              </div>
              <p v-if="validationError" class="mt-2 text-sm text-red-600" role="alert">{{ validationError }}</p>
            </div>
            <div class="mt-10 flex flex-row">
              <button type="button" class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto" @click="cancelEditing(closeFn)" ref="cancelButtonRef">Cancel</button>
              <button type="button" class="inline-flex w-full justify-center rounded-md border px-5 py-1.5 text-sm font-semibold shadow-sm text-white border-fuchsia-800 bg-fuchsia-600 hover:bg-fuchsia-500 sm:ml-3 sm:w-auto" @click="saveAndCloseEditing(closeFn)">Save</button>
            </div>

          </div>
        </PopoverPanel>
      </Teleport>
    </transition>
  </Popover>
</div>
</template>

<script lang="ts" setup>
import * as Vue from 'vue';
import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import emitter from '../emitters/basic';
import { addCommas } from '../lib/BasicUtils';
import VueSlider from 'vue-slider-component'

dayjs.extend(utc);

const capacityMarks = [0, 20, 40, 60, 80, 100];

const props = defineProps<{
  id: string;
  type: 'number' | 'percent';
  modelValue: string | number;
  label?: string;
  sliderMin?: number;
  sliderMax?: number;
}>();

const emit = defineEmits(['showing', 'hiding', 'updated', 'update:modelValue']);

const elementRef = Vue.ref<HTMLElement | null>(null);
const buttonRef = Vue.ref<typeof PopoverButton | null>(null);
const localModel = Vue.ref(props.modelValue);
const validationError = Vue.ref('');
const editingMin = Vue.computed(() => props.id === 'btcMaxTxnsPerHour' ? 1000 : props.sliderMin);
const editingMax = Vue.computed(() => props.id === 'btcMaxTxnsPerHour' ? 25000 : props.sliderMax);

function formatQuantity(value: string | number) {
  const [whole, fraction] = String(value).split('.');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction === undefined ? '' : `.${fraction}`);
}

const formattedModel = Vue.computed({
  get: () => formatQuantity(props.id === 'bitcoinsInLiquidLocks' && typeof localModel.value === 'number'
    ? Number(localModel.value.toFixed(2)) : localModel.value),
  set: (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    if (props.id === 'bitcoinsInLiquidLocks') {
      const [whole, fraction] = cleaned.split('.');
      localModel.value = whole + (fraction === undefined ? '' : `.${fraction.slice(0, 2)}`);
    } else {
      localModel.value = cleaned;
    }
    validationError.value = '';
  },
});

function compactQuantity(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value);
}

function onQuantityInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const position = input.selectionStart ?? input.value.length;
  const digitsBeforeCaret = input.value.slice(0, position).replace(/[^0-9.]/g, '').length;
  formattedModel.value = input.value;
  Vue.nextTick(() => {
    input.value = formattedModel.value;
    let caret = 0;
    let count = 0;
    while (caret < input.value.length && count < digitsBeforeCaret) {
      if (input.value[caret] !== ',') count++;
      caret++;
    }
    input.setSelectionRange(caret, caret);
  });
}

function sliderPosition(value: number) {
  const min = editingMin.value ?? 0;
  const max = editingMax.value ?? 1;
  const bounded = Math.max(min, Math.min(max, value));
  if (props.id === 'btcMaxTxnsPerHour') return (bounded - min) / (max - min) * 1000;
  if (min > 0) return Math.log(bounded / min) / Math.log(max / min) * 1000;
  return Math.log1p(bounded - min) / Math.log1p(max - min) * 1000;
}

function sliderValue(position: number) {
  const min = editingMin.value ?? 0;
  const max = editingMax.value ?? 1;
  if (position <= 0) return min;
  if (position >= 1000) return max;
  if (props.id === 'btcMaxTxnsPerHour') return min + position / 1000 * (max - min);
  return min > 0 ? min * Math.pow(max / min, position / 1000)
    : min + Math.expm1(position / 1000 * Math.log1p(max - min));
}

const quantityMarks = Vue.computed(() => [0, 1000]
  .map(position => ({ position, value: sliderValue(position) })));

const quantitySlider = Vue.computed({
  get() {
    const value = Number(localModel.value);
    return sliderPosition(Number.isFinite(value) ? value : editingMin.value ?? 0);
  },
  set(position: number) {
    const value = sliderValue(position);
    localModel.value = Math.max(editingMin.value ?? 0, Math.min(editingMax.value ?? 1,
      props.id === 'bitcoinsInLiquidLocks'
        ? Number(Number(value.toPrecision(4)).toFixed(8)) : Math.round(value)));
    validationError.value = '';
  },
});

Vue.watch(() => props.modelValue, (newValue) => {
  localModel.value = newValue;
});

function onOpen() {
  validationError.value = '';
  localModel.value = props.modelValue;
}

function rightPx() {
  const buttonRect = buttonRef.value?.$el.getBoundingClientRect();
  if (!buttonRect) return 0;

  const screenWidth = window.innerWidth;
  return `${screenWidth - buttonRect.right}px`;
}

function topPx() {
  const buttonRect = buttonRef.value?.$el.getBoundingClientRect();
  if (!buttonRect) return 0;

  return `${buttonRect.bottom}px`;
}

function handleKeyPress(closeFn: () => void, event: KeyboardEvent) {
  if (event.key === 'ArrowUp') {
    localModel.value = Math.min(editingMax.value ?? Infinity, Math.max(editingMin.value ?? 0, Number(localModel.value) + 1)).toString();
  } else if (event.key === 'ArrowDown') {
    localModel.value = Math.max(editingMin.value ?? 0, Number(localModel.value) - 1).toString();
  } else if (event.key === 'Enter') {
    saveAndCloseEditing(closeFn);
  } else if (event.key === 'Escape') {
    cancelEditing(closeFn);
  }
}

function saveAndCloseEditing(closeFn: () => void) {
  const value = Number(localModel.value);
  if (String(localModel.value).trim() === '' || !Number.isFinite(value) || value < 0) {
    validationError.value = 'Enter a valid quantity of zero or more.';
    return;
  }
  if (editingMin.value !== undefined && value < editingMin.value) {
    validationError.value = `Enter a quantity of at least ${formatQuantity(editingMin.value)}.`;
    return;
  }
  if (['circulation', 'btcMaxTxnsPerHour'].includes(props.id) && editingMax.value !== undefined && value > editingMax.value) {
    validationError.value = `Enter a quantity of no more than ${formatQuantity(editingMax.value)}.`;
    return;
  }
  closeFn();
  hideOverlay({ isSaving: true, value });
}

function cancelEditing(closeFn: () => void) {
  closeFn();
  localModel.value = props.modelValue;
  hideOverlay({});
}

Vue.watch(localModel, (val) => {
  if (['number', 'percent'].includes(props.type)) {
    if (typeof val === 'string') {
      localModel.value = val.replace(/[^0-9.]/g, '');
    }
  }
});

function hideOverlay(data: any) {
  if (data.isSaving) {
    updateModelValue(data.value);
  }
  finishClosing();
}

function showingEditor() {
  elementRef.value?.querySelector(`[type="${props.type}"]`)?.classList.add('showingOverlay');
  emit('showing')
}

function finishClosing() {
  elementRef.value?.querySelector(`[type="${props.type}"]`)?.classList.remove('showingOverlay');
  emit('hiding')
}

function updateModelValue(value: string | number | Dayjs) {
  if (props.type === 'number') {
    value = Number(value);
  }
  emit('update:modelValue', value);
  setTimeout(() => emit('updated', value), 0);
}

Vue.onMounted(() => {
  emitter.on('hideEditorOverlay', (data) => {
    if (data.id !== props.id) return;
    hideOverlay(data);
  });
});

Vue.onBeforeUnmount(() => {
  emitter.off('hideEditorOverlay', hideOverlay);
});

</script>

<style lang="scss">
.QuantitySlider {
  .SliderMarks { height: 30px; margin: 4px 7px 0; }
  .SliderMark { font-size: 12px; line-height: 16px; white-space: nowrap; transform: translateX(-50%); text-align: center; }
  .MarkTick { display: block; height: 5px; width: 1px; background: #cbd5e1; margin: 0 auto 3px; }
  .FirstMark { transform: none; text-align: left; .MarkTick { margin-left: 0; } }
  .LastMark { transform: translateX(-100%); text-align: right; .MarkTick { margin-right: 0; } }
}
.EditorButton.Component {
  [EditButton] {
    @apply px-2 mx-0.5 text-sm py-0.5 bg-slate-400/20 hover:bg-slate-200/100 rounded border border-slate-400 font-mono cursor-pointer;
    box-shadow: inset 1px 1px 0 0 rgba(255, 255, 255, 0.75);
    &.showingOverlay {
      @apply bg-slate-400/40 hover:bg-slate-400/40;
      box-shadow: inset 1px 1px 1px 0 rgba(0, 0, 0, 0.15);
    }
  }
}

</style>
