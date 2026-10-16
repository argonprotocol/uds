<template>
  <TransitionRoot as="template" :show="open" @after-leave="completeStep">
    <Dialog class="relative z-[2000]" @close="finishTour">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 w-screen overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel class="relative w-full max-w-lg rounded-lg bg-white px-6 pb-4 pt-5 text-left shadow-xl">
              <DialogTitle as="h3" class="flex items-center justify-between gap-4 text-lg font-semibold leading-6 text-gray-900">
                <span>Customize the Model</span>
                <span class="shrink-0 text-sm text-slate-400">(Step 1 of 2)</span>
              </DialogTitle>
              <div class="mt-2 border-y border-gray-200 py-3">
                <p class="text-sm text-gray-500">Click Current Circulation, Locked In Vaults, or Unlockable Per Hour in the header to adjust the model.</p>
              </div>
              <div class="mt-4 flex justify-end gap-3">
                <button type="button" class="rounded-md px-4 py-1 text-sm text-slate-600 hover:text-fuchsia-700" @click="finishTour">Skip Tour</button>
                <button type="button" class="rounded-md border border-[#969AA5] bg-[#E6EAF3] px-8 py-1 text-sm font-semibold text-slate-700 shadow-sm hover:border-fuchsia-800 hover:bg-fuchsia-600 hover:text-white" @click="nextStep">Next Step</button>
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
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { useBasicStore } from '../store';

const basicStore = useBasicStore();
const open = Vue.ref(true);
let nextTourStep = 2;

function nextStep() {
  open.value = false;
}

function finishTour() {
  nextTourStep = 3;
  open.value = false;
}

function completeStep() {
  basicStore.setConfig({ tourStep: nextTourStep, completedWelcome: true });
}
</script>
