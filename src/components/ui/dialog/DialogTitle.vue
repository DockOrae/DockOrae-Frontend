<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from "@vueuse/core"
import { cn } from "@/lib/utils"
import { DialogTitle, useForwardProps, type DialogTitleProps } from "reka-ui"

interface Props extends DialogTitleProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

const delegatedProps = reactiveOmit(props, "class")
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <DialogTitle
    data-slot="dialog-title"
    v-bind="forwardedProps"
    :class="cn('text-sm font-semibold', props.class)"
  >
    <slot />
  </DialogTitle>
</template>
