<template>
  <Card class="p-5 hover:border-brand/40 transition-colors cursor-pointer" @click="$emit('click')">
    <div class="flex items-center justify-between">
      <span class="w-10 h-10 rounded-xl flex items-center justify-center" :style="{ background: bg, color: color }">
        <Icon :name="icon" :size="20" />
      </span>
      <span v-if="sub" class="text-[11px] text-muted">{{ sub }}</span>
    </div>
    <div class="mt-3 text-2xl font-bold tracking-tight">{{ value }}</div>
    <div class="text-xs text-muted mt-0.5">{{ label }}</div>
  </Card>
</template>

<script setup lang="ts">
import { Card } from '@/components/ui/card'
import Icon from './Icon.vue'
import type { IconName } from '../icons'

withDefaults(
  defineProps<{
    icon: IconName
    label: string
    value: string | number
    sub?: string
    color?: string
    bg?: string
  }>(),
  {
    sub: '',
    color: '#ec4899',
    bg: 'rgba(236,72,153,.12)',
  },
)
defineEmits<{ click: [] }>()
</script>
