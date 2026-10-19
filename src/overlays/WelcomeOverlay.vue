<template>
  <TransitionRoot as="template" :show="isOpen">
    <Dialog class="WelcomeOverlay Component relative z-[2000]">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white px-6 pb-4 pt-5 my-10 text-left shadow-xl transition-all w-full max-w-3xl">
              <div class="grow">
                <DialogTitle as="h3" class="whitespace-nowrap px-3">
                  <div class="text-lg font-bold text-slate-900/30">Argon System Modeling</div>
                  <div class="text-4xl font-bold text-gray-900">Ultimate Death Spiraling</div>
                </DialogTitle>

                <div class="mt-3 text-left sm:mt-5 border-y border-gray-200 pt-4 pb-6 text-base text-gray-500 space-y-3 px-3 cursor-default">
                  <p>
                    Argon is the first crypto asset with an ability to remain stable without requiring off-chain collateral or centralized authorities. This
                    Ultimate Death Spiraling allows you to explore Argon's resilience by testing real-world scenarios.
                  </p>
                  
<!--                  <div v-if="showVideo" class="grow relative !py-5 w-full">-->
<!--                    <div class="LoadingPulse absolute inset-0 flex items-center justify-center text-slate-500/60 text-3xl uppercase">Loading Video...</div>-->
<!--                    <wistia-player media-id="o32bfzhcor"></wistia-player>-->
<!--                  </div>-->
<!--                  <div v-else VideoLink @click="expandVideo" class="border border-dashed border-gray-400 rounded-md py-4 !my-5 text-center group cursor-pointer">-->
<!--                    <div class="text-lg text-fuchsia-600 group-hover:text-fuchsia-500 cursor-pointer pl-1 font-bold">-->
<!--                      <PlayOutlined OutlineIcon class="w-6 h-6 inline-block relative top-[-1px]" />-->
<!--                      <PlaySolid SolidIcon class="w-6 h-6 inline-block relative top-[-1px]" />-->
<!--                      <span class="inline-block underline decoration-dashed decoration-fuchsia-300/50 underline-offset-[6px] ml-2">Watch <em class="italic">The Intro Video</em></span>-->
<!--                    </div>-->
<!--                    <p class="text-sm text-gray-500 mx-20 mt-2 group-hover:text-fuchsia-900/60">-->
<!--                      A short video from our founder on how Argon’s stabilization mechanisms alleviate the risk of death spirals.-->
<!--                    </p>-->
<!--                  </div>-->

                  <p>
                    To learn more,
                    <a @click="openWhitepapersOverlay">read our Whitepapers</a>, explore 
                    <a @click="openFaqOverlay">Frequently Asked Questions</a>, or 
                    <a @click="openDetailsOfLiquidLocking">learn more about Argon's Stabilization Mechanisms</a>.
                  </p>

                </div>
              </div>
              <div class="flex flex-row-reverse justify-start px-3">
                <button ref="nextButtonRef" type="button" class="rounded-md bg-[#E6EAF3] border border-[#969AA5] px-8 py-2 mt-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-200 hover:border-slate-600 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-fuchsia-500" @click="close">
                  Get Started
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import * as Vue from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import PlayOutlined from '../assets/play-outlined.svg';
import PlaySolid from '../assets/play-solid.svg';
import { useBasicStore } from '../store';
import emitter from '../emitters/basic';

const basicStore = useBasicStore();

const isOpen = Vue.ref(false);
const showVideo = Vue.ref(false);

const nextButtonRef = Vue.ref<HTMLElement | null>(null);

function close() {
  isOpen.value = false;
  basicStore.setConfig({ completedWelcome: true });
}

function expandVideo() {
  showVideo.value = true;
}

function openWhitepapersOverlay() {
  isOpen.value = false;
  emitter.emit('openWhitepapersOverlay');
}

function openFaqOverlay() {
  isOpen.value = false;
  emitter.emit('openFaqOverlay');
}

function openDetailsOfLiquidLocking() {
  isOpen.value = false;
  emitter.emit('openDetailsOfLiquidLocking');
}

emitter.on('openWelcomeOverlay', () => {
  isOpen.value = true;
});

Vue.onMounted(() => {
  Vue.nextTick(() => {
    nextButtonRef.value?.focus();
  });
});
</script>

<style lang="scss">
.WelcomeOverlay.Component {
  a {
    @apply text-fuchsia-600 hover:text-fuchsia-500 underline decoration-dashed;
    cursor: pointer;
  }

  ol {
    list-style-type: none; /* Remove default list style */
    counter-reset: list-counter; /* Initialize counter */
  }

  ol > li {
    counter-increment: list-counter; /* Increment the counter */
    position: relative; /* For absolute positioning of number */
    padding-left: 1.2rem; /* Add space for the custom number */
  }

  ol > li::before {
    content: counter(list-counter) ")"; /* Add custom number with closing parenthesis */
    position: absolute; /* Position number absolutely */
    left: 0; /* Align to the left */
  }

  button[Main] {
    box-shadow: inset 1px 1px 1px 0 rgb(255 255 255 / 0.8);
  }

  [VideoLink] {
    position: relative;

    [SolidIcon] {
      display: none;
    }
    [OutlineIcon] {
      display: inline-block;
    }
    &:hover {
      &::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgb(192 38 211 / 0.05);
      }
      [SolidIcon] {
        display: inline-block;
      }
      [OutlineIcon] {
        display: none;
      }
      svg path {
        fill: rgb(192 38 211 / 0.8) !important;
      }
    }
    svg path {
      fill: rgb(192 38 211) !important;
    }
  }
}
</style>
