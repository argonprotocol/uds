<template>
  <TransitionRoot as="template" :show="isOpen">
    <Dialog class="relative z-[2000]" @close="closeOverlay()">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            
            <DialogPanel class="relative transform rounded-lg bg-white px-5 pb-3 pt-3 text-left shadow-xl transition-all w-full max-w-3xl my-6">
              
              <button v-if="completedWelcome" type="button" aria-label="Close FAQ" @click="closeOverlay()" CloseIcon class="absolute -top-2 -right-2 cursor-pointer flex flex-row items-center space-x-1 border border-slate-400/70 rounded-full p-2 bg-white hover:bg-slate-300 z-1">
                <XMarkIcon class="inline-block w-4 h-4" />
              </button>
              <div v-if="!completedWelcome" class="pb-3 border-b border-slate-300">
                <button type="button" @click="closeOverlay()" class="inline-block cursor-pointer text-gray-400 hover:text-fuchsia-600">
                  <ArrowLeftIcon class="inline-block w-4 h-4 relative top-[-1.5px]" /> Back to Welcome
                </button>
              </div>

              <DialogTitle class="text-3xl font-bold text-center py-3 border-b border-slate-300">Frequently Asked Questions</DialogTitle>

              <div class="divide-y px-1 sm:px-4 overflow-y-auto max-h-[65vh]">

                <details class="py-4" open>
                  <summary class="cursor-pointer text-lg font-semibold hover:text-fuchsia-600">What Does This Simulator Show?</summary>
                  <div class="space-y-3 pt-3 text-base text-gray-500 cursor-default">
                    <p>It explores how the Argon stablecoin responds when its price moves below or above target.
                      You can adjust the the starting conditions to compare stabilization outcomes.</p>
                  </div>
                </details>

                <details class="py-4">
                  <summary class="cursor-pointer text-lg font-semibold hover:text-fuchsia-600">How Do I Get Started?</summary>
                  <div class="space-y-3 pt-3 text-base text-gray-500 cursor-default">
                    <p>Drag the chart’s price line either up or down to choose a starting price.</p>
                  </div>
                </details>

                <details class="py-4">
                  <summary class="cursor-pointer text-lg font-semibold hover:text-fuchsia-600">How Does the Model Recover Below Target?</summary>
                  <div class="space-y-3 pt-3 text-base text-gray-500 cursor-default">
                    <p>Bitcoin unlocking burns Argon, reducing circulating supply. Other enabled mechanisms can also affect recovery. Results depend on available BTC, unlocking limits, participant delays, and demand assumptions.</p>
                  </div>
                </details>

                <details class="py-4">
                  <summary class="cursor-pointer text-lg font-semibold hover:text-fuchsia-600">Why Might Recovery Pause Before Another Price Drop?</summary>
                  <div class="space-y-3 pt-3 text-base text-gray-500 cursor-default">
                    <p>The model protects BTC for a possible crash to $0.001. If spendable BTC runs out, it waits three days by default before modeling a 24-hour selloff. At the bottom, the protected BTC becomes available for recovery.</p>
                  </div>
                </details>

                <details class="py-4">
                  <summary class="cursor-pointer text-lg font-semibold hover:text-fuchsia-600">What Happens Above Target?</summary>
                  <div class="space-y-3 pt-3 text-base text-gray-500 cursor-default">
                    <p>The model adds supply at daily intervals, split equally between mining and BTC Liquids. It assumes sufficient miner and new BTC participation while modeled demand stays fixed.</p>
                  </div>
                </details>

                <details class="py-4">
                  <summary class="cursor-pointer text-lg font-semibold hover:text-fuchsia-600">Where Do the Starting Values Come From?</summary>
                  <div class="space-y-3 pt-3 text-base text-gray-500 cursor-default">
                    <p>The default circulation, locked BTC, and target price come from a bundled mainnet snapshot. They are refreshed when the app’s data is updated and published. The target stays fixed during each run.</p>
                  </div>
                </details>

                <details class="py-4">
                  <summary class="cursor-pointer text-lg font-semibold hover:text-fuchsia-600">What Does “Unachievable” Mean?</summary>
                  <div class="space-y-3 pt-3 text-base text-gray-500 cursor-default">
                    <p>The scenario did not reach target within its modeled window, which runs for up to six simulated months for below-target recovery and 30 days for above-target minting. It does not establish that recovery could never happen later.</p>
                  </div>
                </details>

                <details class="py-4">
                  <summary class="cursor-pointer text-lg font-semibold hover:text-fuchsia-600">Does This Predict What Will Happen on Mainnet?</summary>
                  <div class="space-y-3 pt-3 text-base text-gray-500 cursor-default">
                    <p>No. The simulator simplifies trading, participant behavior, and protocol accounting. It helps explore assumptions; its prices and recovery times are not predictions.</p>
                  </div>
                </details>
              </div>
              
            </DialogPanel>

          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>


<script setup lang="ts">
import * as Vue from 'vue';
import { storeToRefs } from 'pinia';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import emitter from '../emitters/basic';
import { ArrowLeftIcon } from '@heroicons/vue/24/outline';
import { useBasicStore } from '../store';

const basicStore = useBasicStore();
const { completedWelcome } = storeToRefs(basicStore);

const isOpen = Vue.ref(false);

function closeOverlay() {
  isOpen.value = false;
  if (!completedWelcome.value) {
    emitter.emit('openWelcomeOverlay');
  }
}

emitter.on('openFaqOverlay', () => {
  isOpen.value = true;
});

</script>

<style lang="scss" scoped>
a {
  @apply text-slate-600 hover:text-fuchsia-500;
  cursor: pointer;
  &[disabled] {
    @apply pointer-events-none;
    div {
      @apply opacity-30;  
    }
  }
}

[CloseIcon]:hover {
    opacity: 1;
    svg path {
      opacity: 1;
      fill: white;
      stroke: white;
    }
  }
</style>