<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from "@vueuse/core"
import { cn } from "@/lib/utils"
import { AlertDialogContent, AlertDialogOverlay, AlertDialogPortal, useForwardPropsEmits, type AlertDialogContentProps, type AlertDialogContentEmits } from "reka-ui"

defineOptions({
  inheritAttrs: false,
})

interface Props extends AlertDialogContentProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

const emits = defineEmits<AlertDialogContentEmits>()

const delegatedProps = reactiveOmit(props, "class")
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <AlertDialogPortal>
    <AlertDialogOverlay
      data-slot="alert-dialog-overlay"
      class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
    />
    <AlertDialogContent
      data-slot="alert-dialog-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="
        cn(
          'bg-card text-card-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:slide-out-to-bottom-2 fixed top-[50%] left-[50%] z-50 flex w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-[0.9rem] border border-line shadow-2xl shadow-black/40 translate-x-[-50%] translate-y-[-50%] duration-200 sm:max-w-lg',
          props.class,
        )
      "
    >
      <slot />
    </AlertDialogContent>
  </AlertDialogPortal>
</template>
