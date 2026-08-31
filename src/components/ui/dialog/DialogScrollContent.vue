<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { X } from "@lucide/vue"
import { reactiveOmit } from "@vueuse/core"
import { cn } from "@/lib/utils"
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, useForwardPropsEmits, type DialogContentProps, type DialogContentEmits } from "reka-ui"

defineOptions({
  inheritAttrs: false,
})

interface Props extends DialogContentProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

const emits = defineEmits<DialogContentEmits>()

const delegatedProps = reactiveOmit(props, "class")
const forwarded = useForwardPropsEmits(delegatedProps, emits)

// 点击遮罩判定:点击位置超出内容区域(offset 越界)才视为点击遮罩关闭
function onPointerDownOutside(event: {
  detail: { originalEvent: PointerEvent }
  preventDefault: () => void
}): void {
  const originalEvent = event.detail.originalEvent
  const target = originalEvent.target as HTMLElement | null
  if (target && (originalEvent.offsetX > target.clientWidth || originalEvent.offsetY > target.clientHeight)) {
    event.preventDefault()
  }
}
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    >
      <DialogContent
        :class="
          cn(
            'relative z-50 w-full max-w-lg my-8 flex flex-col overflow-hidden border border-line bg-card text-card-foreground shadow-2xl shadow-black/40 duration-200 sm:rounded-[0.9rem] md:w-full',
            props.class,
          )
        "
        v-bind="{ ...$attrs, ...forwarded }"
        @pointer-down-outside="onPointerDownOutside"
      >
        <slot />

        <DialogClose
          class="absolute top-2 right-2 p-1.5 transition-colors rounded-[0.5rem] text-muted hover:text-text hover:bg-surface2"
        >
          <X class="w-4 h-4" />
          <span class="sr-only">Close</span>
        </DialogClose>
      </DialogContent>
    </DialogOverlay>
  </DialogPortal>
</template>
