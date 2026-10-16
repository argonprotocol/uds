<template>
  <Popover class="MoreInfoMenu Component px-1 cursor-pointer">
    <PopoverButton as="div" @click="hideTooltip" ref="menuButtonRef" class="IconWrapper" @mouseenter="showTooltip($event, 'Learn More')" @mouseleave="hideTooltip">
      <div IconWrapper>
        <InformationOutlined OutlineIcon class="h-[24px]" @click="" />
        <InformationSolid SolidIcon class="h-[24px]" />
      </div>
    </PopoverButton>
    <transition enter-active-class="transition ease-out duration-200" enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition ease-in duration-150" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-1">
      <PopoverPanel ref="menuRef" v-slot="{ close: closeFn }" class="absolute -right-0 z-[3000] mt-2 flex w-screen max-w-min px-4">
        <div class="absolute -top-3 right-[45px] transform -translate-x-1/2">
          <svg width="24" height="12" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0L24 12H0L12 0Z" fill="white"/>
          </svg>
        </div>
        <div class="rounded bg-white p-1 pb-1 text-sm font-light leading-6 text-gray-900 shadow-lg ring-1 ring-gray-900/5 text-right whitespace-nowrap">
          <!-- <a @click="openDetailsOfLiquidLocking(closeFn)" class="block pt-2 pb-1 px-3 hover:text-fuchsia-600 border-t border-gray-200 hover:bg-[#FAF4FC]">Explore Argon's Stabilization</a> -->
          <a @click="openFaqOverlay(closeFn)" class="block pt-2 pb-1 px-3 hover:text-fuchsia-600 hover:bg-[#FAF4FC]">Frequently Asked Questions</a>
          <a @click="openWhitepapersOverlay(closeFn)" class="block pt-2 pb-1 px-3 hover:text-fuchsia-600 border-t border-gray-200 hover:bg-[#FAF4FC]">Read Our Whitepapers</a>
          <a v-if="false" @click="openVideoOverlay(closeFn)" class="block pb-2 pt-1 px-3 hover:text-fuchsia-600 hover:bg-[#FAF4FC]">Watch <span class="italic">Intro to Restabilization</span></a>
          <a href="https://argon.network/docs/engine-modeling/uds" class="block py-2 px-3 hover:text-fuchsia-600 border-t border-gray-200 hover:bg-[#FAF4FC]">Open Argon Docs</a>
        </div>
      </PopoverPanel>
    </transition>
  </Popover>
</template>

<script setup lang="ts">
import * as Vue from 'vue';
import InformationOutlined from '@/assets/information-outlined.svg';
import InformationSolid from '@/assets/information-solid.svg';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import * as TooltipUtils from '../lib/TooltipUtils';
import emitter from '../emitters/basic';

const menuRef = Vue.ref<typeof PopoverPanel | null>(null);
const menuButtonRef = Vue.ref<typeof PopoverButton | null>(null);

const $menuElem = Vue.computed(() => menuRef.value?.$el);
const $menuButtonElem = Vue.computed(() => menuButtonRef.value?.$el);

function openDetailsOfLiquidLocking(closeFn?: () => void) {
  emitter.emit('openDetailsOfLiquidLocking');
  closeFn?.();
}

function showTooltip(event: MouseEvent, label: string) {
  if (menuRef.value?.$el) return;

  TooltipUtils.showTooltip(event, label);
}

function hideTooltip(event: MouseEvent, forceHide = false) {
  TooltipUtils.hideTooltip();
}

function openFaqOverlay(closeFn?: () => void) {
  emitter.emit('openFaqOverlay');
  closeFn?.();
}

function openWhitepapersOverlay(closeFn?: () => void) {
  emitter.emit('openWhitepapersOverlay');
  closeFn?.();
}

function openVideoOverlay(closeFn?: () => void) {
  emitter.emit('openVideoOverlay');
  closeFn?.();
}

defineExpose({ $menuElem, $menuButtonElem });
</script>

<style lang="scss" scoped>
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
</style>
