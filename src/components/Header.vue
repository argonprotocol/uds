<template>
  <div HeaderBar :class="[isReady ? '' : 'pointer-events-none']" class="HEADER COMPONENT flex flex-row pl-4 items-center">
    <div :class="[isRunning ? 'opacity-30' : 'opacity-100']" class="grow flex flex-row items-center">
      <a Logo href="https://argonprotocol.org" class="block w-8 relative top-[1px]"><Logo /></a>
      <h1 class="text-2xl font-extralight relative top-[0.5px] text-left pl-[10px] py-3 whitespace-nowrap text-slate-600">
      Stabilization Analysis Model
    </h1>
    </div>
    <div class="flex flex-row space-x-1 items-center divide-x-1 pr-4">
      <ul :class="[isRunning ? 'opacity-50' : 'opacity-100']" class="TOGGLE flex flex-row bg-[#E9EBF1] border border-[#b8b9bd] rounded mr-4 text-center text-slate-600" :disabled="!isReady" :isRunning="isRunning">
        <li class="border-r border-slate-400" @click="saveFilter('collapseThenRecover')" :class="{ 'selected': selectedFilter === 'collapseThenRecover' }" insightId="collapseThenRecover" @mouseenter="showInsight" @mouseleave="hideInsight">
          <span>Argon Mechanisms Enabled After Collapse</span>
        </li>
        <li class="border-r border-slate-400" @click="saveFilter('collapsedForever')" :class="{ 'selected': selectedFilter === 'collapsedForever' }" insightId="collapsedForever" align="right" @mouseenter="showInsight" @mouseleave="hideInsight">
          <span>Never Enabled</span>
        </li>
        <li class="" @click="saveFilter('collapsingRecovery')" :class="{ 'selected': selectedFilter === 'collapsingRecovery' }" insightId="collapsingRecovery" align="right" @mouseenter="showInsight" @mouseleave="hideInsight">
          <span>Always Enabled</span>
        </li>
      </ul>
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

        <div class="px-1 cursor-pointer">
          <div @click="openVideoOverlay()" class="IconWrapper" @mouseenter="showTooltip($event, 'Watch Video')" @mouseleave="hideTooltip">
            <PlayOutlined OutlineIcon class="w-[24px]" />
            <PlaySolid SolidIcon class="w-[24px]" />
          </div>
        </div>

        <MoreInfoMenu ref="moreInfoMenuRef" />

        <div class="px-1 cursor-pointer">
          <a class="IconWrapper" href="https://github.com/argonprotocol/sam" target="_blank" @mouseenter="showTooltip($event, 'Open Codebase')" @mouseleave="hideTooltip">
            <GithubOutlined OutlineIcon class="h-[24px]" @click="" />
            <GithubSolid SolidIcon class="h-[24px]" />
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
import { IFilterName, useBasicStore } from '../store';
import MoreInfoMenu from './MoreInfoMenu.vue';
import { showTooltip, hideTooltip } from '../lib/TooltipUtils';
import { showInsight, hideInsight } from '../lib/InsightUtils';
import emitter from '../emitters/basic';

const basicStore = useBasicStore();
const { selectedFilter, isReady, isRunning } = storeToRefs(basicStore);

async function resetToDefault() {
  await basicStore.resetConfig();
  window.location.reload();
}

function saveFilter(filter: IFilterName) {
  basicStore.setConfig({ selectedFilter: filter });
}

function openVideoOverlay() {
  emitter.emit('openVideoOverlay');
}
</script>

<style lang="scss">
  .HEADER.COMPONENT {
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

    ul.TOGGLE {
      position: relative;
      box-shadow: inset 1px 1px 2px rgba(0,0,0,0.2);
      white-space: nowrap;
      &[disabled='true'] {
        pointer-events: none;
      }
      &[isRunning='true'] li {
        opacity: 0.5 !important;
      }
      li {
        z-index: 1;
        cursor: pointer;
        padding: 4px 16px;
        transition: opacity 0.3s ease;
        position: relative;
        span {
          display: block;
          width: 100%;
          height: 100%;
          position: relative;
          z-index: 2;
        }
      }
      li.selected:after {
        content: '';
        width: calc(100% + 2px);
        height: calc(100% + 2px);
        position: absolute;
        top: -1px;
        left: -1px;
        background: white;
        border-radius: 5px;
        border: 1px solid #979797;
        box-shadow: 0 1px rgba(0,0,0,0.1);
        cursor: default;
        transition: left 0.3s ease;
        z-index: 1;
      }
      li:not(.selected) {
        opacity: 0.3;
      }
      li:last-child.selected:after {
        left: -1px;
      }
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
