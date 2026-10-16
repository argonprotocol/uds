<template>
  <TransitionRoot as="template" :show="isOpen">
    <Dialog class="relative z-[2000]" @close="closeOverlay()">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div @click="close" class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      </TransitionChild>

      <div @click="close" class="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            
            <DialogPanel class="relative transform rounded-lg bg-white px-5 pb-3 pt-3 text-left shadow-xl transition-all w-full max-w-5xl min-h-[50rem]">
              <div v-if="completedWelcome" @click="closeOverlay()" CloseIcon class="absolute -top-2 -right-2 cursor-pointer flex flex-row items-center space-x-1 border border-slate-400/70 rounded-full p-2 bg-white hover:bg-slate-300 z-1">
                <XMarkIcon class="inline-block w-4 h-4" />
              </div>
              <div v-if="!completedWelcome" class="pb-3 border-b border-slate-300">
                <div @click="closeOverlay()" class="inline-block cursor-pointer text-gray-400 hover:text-fuchsia-600">
                  <ArrowLeftIcon class="inline-block w-4 h-4 relative top-[-1.5px]" /> Back to Welcome
                </div>
              </div>

              <DialogTitle class="text-3xl font-bold text-center py-3 border-b border-slate-300">The Details of Liquid Locking</DialogTitle>

              <div class="flex flex-col space-y-3 px-6 pt-6 overflow-y-scroll overflow-x-auto max-h-[70vh]">
                <p>
                  The tool you are using touches on one of the most novel aspects of Argon: it's relationship to Bitcoin. Bitcoin is the key to Argon stabilization 
                  mechanisms, and in return, Argon delivers lucrative benefits to Bitcoin holders. Bitcons are both given the right to mint Argons when market
                  demand is high, and they are given lucrative profit incentives whenever Argon's price falls below target.
                </p>

                <p>The following mathematical formula determines how many argons are required to be reinserted into the
                  vault to unlock a bitcoin:
                </p>

                <div class="flex justify-center border-t border-b py-5">
                  <!-- <img src="../assets/unlocking-formula.png" alt="The Key Formula" class="w-[500px]" /> -->
                </div>

                <p>To learn more about this mathematical formula, and for more details on Liquid Locking, please see our 2nd whitepaper, The Fundamentals for Creating a Stable Crypto Asset.</p>

                <p>This Liquid Locking model is one of two tools we've created to help us better understand Argon's mechanisms. Our other model, the Ultimate Death Spiral, shows how these vaulted bitcoins stabilize the Argon if and when the argon ever falls below its peg. Click here to open.</p>
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

emitter.on('openDetailsOfLiquidLocking', () => {
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
