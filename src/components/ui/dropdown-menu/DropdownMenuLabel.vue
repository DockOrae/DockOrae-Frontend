<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from "@vueuse/core"
import { cn } from "@/lib/utils"
import { DropdownMenuLabel, useForwardProps, type DropdownMenuLabelProps } from "reka-ui"

interface Props extends DropdownMenuLabelProps {
  class?: HTMLAttributes['class']
  inset?: boolean
}

const props = defineProps<Props>()

const delegatedProps = reactiveOmit(props, "class", "inset")
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <DropdownMenuLabel
    data-slot="dropdown-menu-label"
    :data-inset="inset ? '' : undefined"
    v-bind="forwardedProps"
    :class="
      cn('px-2 py-1.5 text-sm font-medium data-[inset]:pl-8', props.class)
    "
  >
    <slot />
  </DropdownMenuLabel>
</template>
