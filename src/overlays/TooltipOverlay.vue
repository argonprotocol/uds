<template>
  <div id="app-tooltip" role="tooltip" v-if="isOpen" :style="{ top: top, left: left, transform: `translate(${translateX}, ${translateY})` }" :class="{ StatTooltip: wrap }" class="absolute z-[1200] border border-gray-800/20 flex flex-col rounded bg-white px-3 py-1 text-left shadow-lg transition-all pointer-events-none">
    
    <div :style="{ top: arrowTop, bottom: arrowBottom, rotate: arrowRotate, transform: `translate(${arrowTranslateX}, ${arrowTranslateY})` }" class="absolute right-1">
      <svg class="relative z-10" width="24" height="12" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0L24 12H0L12 0Z" fill="white"/>
      </svg>
      <svg class="absolute z-0 -top-0.5 left-[-1px] opacity-10" width="26" height="14" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0L24 12H0L12 0Z" fill="black"/>
      </svg>
    </div>
    
    <div class="grow">
      <div class="py-1 text-left text-sm text-slate-500 font-light" :class="wrap ? 'whitespace-normal' : 'whitespace-nowrap'">
        {{ label }}
      </div>
    </div>            
  </div>
</template>

<script setup lang="ts">
import * as Vue from 'vue';
import dayjs from 'dayjs';
import dayjsUtc from 'dayjs/plugin/utc';
import emitter from '../emitters/basic';

dayjs.extend(dayjsUtc);

const isOpen = Vue.ref(false);

const id = Vue.ref('');

const left = Vue.ref('auto');
const top = Vue.ref('auto');
const translateY = Vue.ref('0');
const translateX = Vue.ref('0');

const arrowLeft = Vue.ref('auto');
const arrowRight = Vue.ref('auto');
const arrowTop = Vue.ref('auto');
const arrowBottom = Vue.ref('auto');
const arrowRotate = Vue.ref('0deg');
const arrowTranslateY = Vue.ref('0');
const arrowTranslateX = Vue.ref('0');

const label = Vue.ref('');
const wrap = Vue.ref(false);
emitter.on('showTooltip', (incoming: any) => {
  isOpen.value = true;
  wrap.value = incoming.wrap ?? false;
  id.value = incoming.id;
  label.value = incoming.label;
  
  top.value = `${incoming.y + 7}px`;
  arrowTop.value = '0px';
  arrowBottom.value = 'auto';
  translateY.value = '0';
  arrowRotate.value = '0deg';
  arrowTranslateY.value = '-100%';

  left.value = `${wrap.value ? Math.max(Math.min(280, window.innerWidth - 16) + 8, Math.min(window.innerWidth - 8, incoming.x + 17)) : incoming.x + 17}px`;
  arrowLeft.value = `${incoming.arrowX}px`;
  arrowRight.value = 'auto';
  translateX.value = '-100%';
  arrowTranslateX.value = '-50%';
});

emitter.on('hideTooltip', () => {
  isOpen.value = false;
});
</script>
<style scoped>
.StatTooltip {
  position: fixed;
  width: 280px;
  max-width: calc(100vw - 16px);
}
</style>
