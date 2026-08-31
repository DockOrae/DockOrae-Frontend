<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-50"
      @click="close"
      @contextmenu.prevent="close"
    >
      <div
        class="ctx-menu"
        :style="{ left: `${x}px`, top: `${y}px` }"
        @click.stop
      >
        <button
          v-for="item in items"
          :key="item.key"
          type="button"
          class="ctx-item"
          :class="{ danger: item.danger, disabled: item.disabled }"
          :disabled="item.disabled"
          @click="pick(item)"
        >
          <Icon :name="item.icon" size="13" class="ctx-ico" />
          <span>{{ t(item.label) }}</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Icon from '../Icon.vue'
import type { IconName } from '../../icons'

export interface CtxMenuItem {
  key: string
  label: string
  icon: IconName
  danger?: boolean
  disabled?: boolean
}

defineProps<{
  visible: boolean
  x: number
  y: number
  items: CtxMenuItem[]
}>()
const emit = defineEmits<{ action: [key: string]; close: [] }>()

const { t } = useI18n()

function pick(item: CtxMenuItem) {
  if (item.disabled) return
  emit('action', item.key)
  emit('close')
}

function close() {
  emit('close')
}
</script>

<style scoped>
.ctx-menu {
  position: fixed;
  min-width: 168px;
  padding: 5px;
  border-radius: 10px;
  background: var(--dm-surface);
  border: 1px solid var(--dm-line);
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.24);
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.ctx-item {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 32px;
  padding: 0 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--dm-text);
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
}
.ctx-item:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-brand) 14%, transparent);
  color: var(--color-brand);
}
.ctx-item.danger {
  color: var(--dm-danger, #ef4444);
}
.ctx-item.danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--dm-danger, #ef4444) 12%, transparent);
  color: var(--dm-danger, #ef4444);
}
.ctx-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.ctx-ico {
  flex-shrink: 0;
}
</style>
