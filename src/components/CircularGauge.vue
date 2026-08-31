<template>
  <div class="flex flex-col items-center">
    <div class="relative" :style="{ width: size + 'px', height: size + 'px' }">
      <svg :width="size" :height="size" viewBox="0 0 120 120">
        <!-- 背景环 -->
        <circle cx="60" cy="60" r="50" fill="none" stroke="var(--dm-surface2)" stroke-width="10" />
        <!-- 进度环 -->
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          :stroke="color"
          stroke-width="10"
          stroke-linecap="round"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="circumference * (1 - clamped / 100)"
          transform="rotate(-90 60 60)"
          class="gauge-bar"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <div class="text-xl font-bold leading-none" :style="{ color }">{{ display }}</div>
        <div v-if="unit" class="text-[10px] text-muted mt-0.5">{{ unit }}</div>
      </div>
    </div>
    <div class="text-[13px] font-semibold mt-2">{{ label }}</div>
    <div v-if="sub" class="text-[11px] text-muted mt-0.5 truncate max-w-[130px]">{{ sub }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 0-100 的百分比 */
    value?: number
    label?: string
    sub?: string
    unit?: string
    color?: string
    size?: number
    /** 中心显示的自定义文本(默认取 value) */
    display?: string | number | null
    /** 小数位 */
    digits?: number
  }>(),
  {
    value: 0,
    label: '',
    sub: '',
    unit: '%',
    color: '#60a5fa',
    size: 120,
    display: null,
    digits: 1,
  },
)

const circumference = Math.round(2 * Math.PI * 50 * 100) / 100
const clamped = computed(() => Math.min(100, Math.max(0, props.value || 0)))
</script>

<style scoped>
.gauge-bar {
  transition: stroke-dashoffset 0.6s ease;
}
</style>
