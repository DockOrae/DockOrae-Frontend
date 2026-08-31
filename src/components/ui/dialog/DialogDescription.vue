<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from "@vueuse/core"
import { cn } from "@/lib/utils"
import { DialogDescription, useForwardProps, type DialogDescriptionProps } from "reka-ui"

interface Props extends DialogDescriptionProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

const delegatedProps = reactiveOmit(props, "class")
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <DialogDescription
    data-slot="dialog-description"
    v-bind="forwardedProps"
    :class="cn('text-muted-foreground text-sm', props.class)"
  >
    <slot />
  </DialogDescription>
</template>
