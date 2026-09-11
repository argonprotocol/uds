<template>
  <div ChartBox class="absolute bottom-0 left-0 right-0 h-1/2 z-0"></div>
</template>

<style lang="scss" scoped>
[ChartBox] {
  &:before {
    content: '';
    display: block;
    position: absolute;
    bottom: 9px;
    left: 9px;
    width: calc(100% - 18px);
    height: calc(100% - 11px);
    background: var(--sam-surface);
    border: 1px solid #b9bcc4;
    box-shadow: 0 0 2px 2px rgba(0,0,0,0.05), inset 2px 2px 0 white;
    border-radius: 3px;
  }
  &:after {
    content: '';
    display: block;
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 50%;
    background: linear-gradient(to bottom, var(--sam-background), rgba(var(--sam-background-rgb), 0));
    z-index: 1;
  }
}
</style>