<template>
  <Dialog :open="open" @update:open="(v: boolean) => emit('update:open', v)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="text-sm font-semibold">{{ t('agent.swap.settings') }}</DialogTitle>
        <DialogDescription class="text-xs">
          {{ currentText }}
        </DialogDescription>
      </DialogHeader>

      <!-- 预设大小(§13:仅 512MB/1GB/2GB/4GB/自定义) -->
      <div class="grid grid-cols-2 gap-2 py-1">
        <label
          v-for="p in presets"
          :key="p.size"
          class="flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition-colors"
          :class="selectedSize === p.size ? 'border-brand bg-brand/10 text-brand' : 'border-border hover:border-brand/50'"
        >
          <input type="radio" :value="p.size" v-model="selectedSize" class="accent-brand" />
          {{ p.label }}
        </label>
        <label
          class="flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition-colors"
          :class="selectedSize === null ? 'border-brand bg-brand/10 text-brand' : 'border-border hover:border-brand/50'"
        >
          <input type="radio" :value="null" v-model="selectedSize" class="accent-brand" />
          {{ t('agent.swap.custom') }}
        </label>
      </div>

      <!-- 自定义大小(仅自定义时显示,最小 512MB) -->
      <div v-if="selectedSize === null" class="flex items-center gap-2">
        <Input v-model.number="customSize" type="number" min="512" step="512" :placeholder="t('agent.swap.customPlaceholder')" class="flex-1" />
        <span class="text-xs text-muted whitespace-nowrap">{{ t('agent.swap.mb') }}</span>
      </div>

      <p v-if="error" class="text-xs text-danger">{{ error }}</p>

      <DialogFooter>
        <DialogClose as-child>
          <Button variant="ghost" size="sm">{{ t('common.cancel') }}</Button>
        </DialogClose>
        <Button variant="brand" size="sm" :disabled="busy" @click="onApply">
          <span v-if="busy" class="animate-spin mr-1.5 inline-block h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
          {{ busy ? t('agent.swap.applying') : t('agent.swap.apply') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { swapAction } from '@/api/agent'
import type { SwapStatus } from '@/types'

const props = defineProps<{ open: boolean; status: SwapStatus | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'updated'): void }>()

const { t } = useI18n()

/** 预设(§13:禁止擅自增加 8G/16G/32G) */
const presets = [
  { size: 512, label: '512 MB' },
  { size: 1024, label: '1 GB' },
  { size: 2048, label: '2 GB' },
  { size: 4096, label: '4 GB' },
]

const selectedSize = ref<number | null>(1024)
const customSize = ref<number>(1024)
const busy = ref(false)
const error = ref('')

// 打开时初始化:当前 swap 大小匹配预设则选中,否则选自定义
watch(
  () => props.open,
  (v) => {
    if (!v) return
    error.value = ''
    const curMB = props.status?.total ? Math.round(props.status.total / 1024 / 1024) : 0
    const hit = presets.find((p) => p.size === curMB)
    if (hit) {
      selectedSize.value = hit.size
    } else {
      selectedSize.value = null
      customSize.value = curMB >= 512 ? curMB : 1024
    }
  },
)

const currentText = computed(() => {
  const s = props.status
  if (!s || !s.enabled || s.total === 0) return t('agent.swap.disabled')
  return `${fmtMB(s.total)} · ${s.devices.map((d) => d.path).join(', ')}`
})

const targetSize = computed(() => (selectedSize.value !== null ? selectedSize.value : Math.round(customSize.value || 0)))

/** 应用:create(当前无 swap)或 resize(已有 swap)(§52:成功后重查 status,不用用户输入更新 UI) */
async function onApply() {
  const size = targetSize.value
  if (!size || size < 512) {
    error.value = t('agent.swap.minSize')
    return
  }
  busy.value = true
  error.value = ''
  try {
    const action = props.status?.enabled ? 'resize' : 'create'
    await swapAction({ action, size_mb: size, confirm: true })
    emit('update:open', false)
    emit('updated') // 父组件重新请求 swap.status 更新卡片
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

function fmtMB(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  return `${Math.round(bytes / 1024 / 1024)} MB`
}
</script>
