<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="filled ? 'currentColor' : 'none'"
    :stroke="filled ? 'none' : 'currentColor'"
    :stroke-width="filled ? 0 : 2"
    stroke-linecap="round"
    stroke-linejoin="round"
    v-html="icons.template(name)"
  />
</template>

<script setup lang="ts">
import icons from '../icons'
import type { IconName } from '../icons'

withDefaults(
  defineProps<{
    name: IconName
    size?: number | string
    /** fill 型图标(如 Remix Icon) */
    filled?: boolean
  }>(),
  {
    size: 16,
    filled: false,
  },
)
</script>
