<template>
  <AlertDialog :open="confirmState.visible" @update:open="onOpenChange">
    <AlertDialogContent :class="sizeClass">
      <div class="px-5 py-4">
        <div class="flex items-center gap-3 mb-2">
          <span
            class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            :class="confirmState.danger ? 'bg-danger/15 text-danger' : 'bg-brand/15 text-brand'"
          >
            <Icon :name="confirmState.danger ? 'alert' : 'info'" :size="18" />
          </span>
          <AlertDialogTitle class="text-sm font-semibold">{{ confirmState.title }}</AlertDialogTitle>
        </div>
        <p class="text-sm text-muted leading-relaxed whitespace-pre-wrap">{{ confirmState.message }}</p>
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel size="sm">{{ t('common.cancel') }}</AlertDialogCancel>
        <AlertDialogAction
          size="sm"
          :variant="confirmState.danger ? 'destructive' : 'brand'"
          @click.capture="onActionClick"
        >
          {{ confirmState.confirmText }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog'
import Icon from './Icon.vue'
import { confirmState, resolveConfirm } from '../confirm'

const { t } = useI18n()
const sizeClass = computed(() => ({ sm: 'sm:max-w-sm', lg: '', xl: 'sm:max-w-xl' }[confirmState.size] || 'sm:max-w-sm'))

// 确认按钮:先置 resolved 标志再 resolve(true),防止 reka 关闭事件的
// onOpenChange(false) 抢先把它 resolve 成 false
// 确认按钮:必须用 click.capture(捕获阶段)抢先 resolve(true)——
// reka 的关闭处理在冒泡阶段,会先触发 onOpenChange(false) 把 promise 解析成 false
function onActionClick() {
  confirmState._resolved = true
  resolveConfirm(true)
}

// ESC / 点击遮罩 / 取消按钮 → reka 触发 update:open=false → 统一 resolve(false)
function onOpenChange(v: boolean) {
  if (!v && !confirmState._resolved) resolveConfirm(false)
}
</script>
