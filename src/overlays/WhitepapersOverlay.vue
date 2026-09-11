<template>
  <TransitionRoot as="template" :show="isOpen">
    <Dialog class="relative z-[2000]" @close="closeOverlay()">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div @click="close" class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      </TransitionChild>

      <div @click="close" class="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            
            <DialogPanel class="relative transform rounded-lg bg-white px-3 pb-3 pt-3 text-left shadow-xl transition-all w-full max-w-3xl">
              <div v-if="completedWelcome" @click="closeOverlay()" CloseIcon class="absolute -top-2 -right-2 cursor-pointer flex flex-row items-center space-x-1 border border-slate-400/70 rounded-full p-2 bg-white hover:bg-slate-300 z-1">
                <XMarkIcon class="inline-block w-4 h-4" />
              </div>
              <div v-if="!completedWelcome" class="pb-3 border-b border-slate-300">
                <div @click="closeOverlay()" class="inline-block cursor-pointer text-gray-400 hover:text-fuchsia-600">
                  <ArrowLeftIcon class="inline-block w-4 h-4 relative top-[-1.5px]" /> Back to Welcome
                </div>
              </div>

              <DialogTitle class="text-3xl font-bold text-center py-3 border-b border-slate-300">Our Whitepapers</DialogTitle>

              <div class="flex flex-col divide-y text-center">
                <a class="block pt-6 pb-5 outline-none" href="https://argon.network/on-the-stabilization-of-collateral-backed-stablecoins.pdf" target="_blank" rel="noopener noreferrer">
                  <div class="text-lg font-bold">On the Stabilization of Collateral-Backed Stablecoins</div>
                  <div class="text-sm text-slate-400">By Caleb Clark and Blake Byrnes</div>
                </a>
                <a class="block pt-6 pb-5 outline-none" href="https://argon.network/the-fundamentals-for-creating-a-stable-crypto-asset.pdf" target="_blank" rel="noopener noreferrer">
                  <div class="text-lg font-bold">The Fundamentals for Creating a Stable Crypto Asset</div>
                  <div class="text-sm text-slate-400">By Caleb Clark and Blake Byrnes</div>
                </a>
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

emitter.on('openWhitepapersOverlay', () => {
  isOpen.value = true;
});

</script>

<style lang="scss" scoped>
a {
  @apply text-slate-600 hover:text-fuchsia-500;
  cursor: pointer;
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
