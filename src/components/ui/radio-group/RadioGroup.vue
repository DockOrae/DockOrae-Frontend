<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from "@vueuse/core"
import { cn } from "@/lib/utils"
import { RadioGroupRoot, useForwardPropsEmits, type RadioGroupRootProps, type RadioGroupRootEmits } from "reka-ui"

interface Props extends RadioGroupRootProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

const emits = defineEmits<RadioGroupRootEmits>()

const delegatedProps = reactiveOmit(props, "class")
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <RadioGroupRoot
    v-slot="slotProps"
    data-slot="radio-group"
    :class="cn('grid gap-3', props.class)"
    v-bind="forwarded"
  >
    <slot v-bind="slotProps" />
  </RadioGroupRoot>
</template>
