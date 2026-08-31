<template>
  <Dialog :open="modelValue" @update:open="onOpenChange">
    <DialogContent :class="sizeClass" @close="emit('close')">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogClose as-child>
          <Button variant="icon" :aria-label="'close'">
            <Icon name="x" size="14" />
          </Button>
        </DialogClose>
      </DialogHeader>
      <div class="px-5 py-4 overflow-y-auto">
        <slot />
      </div>
      <DialogFooter v-if="$slots.footer">
        <slot name="footer" />
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import Icon from './Icon.vue'

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    title?: string
    size?: 'lg' | 'xl' | '2xl' // lg | xl | 2xl
  }>(),
  {
    title: '',
    size: 'lg',
  },
)
const emit = defineEmits<{ close: []; 'update:modelValue': [v: boolean] }>()

const sizeClass = computed(() => ({ lg: '', xl: 'sm:max-w-xl', '2xl': 'sm:max-w-2xl' }[props.size] || ''))

function onOpenChange(v: boolean) {
  emit('update:modelValue', v)
  if (!v) emit('close')
}
</script>
