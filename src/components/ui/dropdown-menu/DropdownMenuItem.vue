<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from "@vueuse/core"
import { cn } from "@/lib/utils"
import { DropdownMenuItem, useForwardProps, type DropdownMenuItemProps } from "reka-ui"

interface Props extends DropdownMenuItemProps {
  class?: HTMLAttributes['class']
  inset?: boolean
  variant?: string
}

const props = withDefaults(defineProps<Props>(), { variant: 'default' })

const delegatedProps = reactiveOmit(props, "class", "inset", "variant")
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <DropdownMenuItem
    data-slot="dropdown-menu-item"
    :data-inset="inset ? '' : undefined"
    :data-variant="variant"
    v-bind="forwardedProps"
    :class="
      cn(
        `relative flex cursor-default items-center gap-2 rounded-[0.4rem] px-2 py-1.5 text-sm outline-hidden select-none focus:bg-surface2 focus:text-text data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 data-[variant=destructive]:text-danger data-[variant=destructive]:focus:bg-danger/10 data-[variant=destructive]:focus:text-danger [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:*:[svg]:text-danger!`,
        props.class,
      )
    "
  >
    <slot />
  </DropdownMenuItem>
</template>
