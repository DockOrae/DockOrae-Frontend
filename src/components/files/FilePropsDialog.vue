<template>
  <Modal :model-value="open" :title="t('files.propsTitle')" size="lg" @close="emit('close')" @update:model-value="onModel">
    <div v-if="entry" class="space-y-3 text-[13px]">
      <div class="grid grid-cols-[92px_1fr] gap-y-2.5 items-center">
        <span class="text-muted">{{ t('files.propName') }}</span>
        <span class="flex items-center gap-2 min-w-0">
          <Icon :name="iconFor(entry)" size="15" :class="entry.type === 'directory' ? 'text-brand' : 'text-muted'" class="shrink-0" />
          <span class="truncate">{{ entry.name }}</span>
        </span>
        <span class="text-muted">{{ t('files.propPath') }}</span>
        <span class="break-all select-all">{{ entry.path }}</span>
        <span class="text-muted">{{ t('files.propType') }}</span>
        <span>{{ typeLabel(entry.type) }}{{ entry.type === 'symlink' && entry.target ? ` → ${entry.target}` : '' }}</span>
        <span class="text-muted">{{ t('files.propSize') }}</span>
        <span>{{ entry.type === 'directory' ? t('files.sizeDir') : formatBytes(entry.size) }}</span>
        <span class="text-muted">{{ t('files.propModified') }}</span>
        <span>{{ formatTime(entry.modified_at) }}</span>
        <span class="text-muted">{{ t('files.propPermission') }}</span>
        <span class="font-mono">{{ entry.permissions }}</span>
        <span class="text-muted">{{ t('files.propOwner') }}</span>
        <span class="font-mono">{{ entry.owner || '—' }}</span>
        <span class="text-muted">{{ t('files.propGroup') }}</span>
        <span class="font-mono">{{ entry.group || '—' }}</span>
      </div>

      <!-- chmod 勾选式(1Panel 风格:所有者/用户组/其他人 × 读/写/执行 + 特殊位) -->
      <div class="pt-3 border-t border-line space-y-2.5">
        <Label class="text-xs text-muted">{{ t('files.propMode') }}</Label>
        <div class="grid grid-cols-[56px_1fr] gap-y-2 items-center text-[12.5px]">
          <span class="text-muted">{{ t('files.permOwner') }}</span>
          <div class="flex items-center gap-4">
            <label v-for="b in permRows[0]" :key="b.key" class="flex items-center gap-1.5 cursor-pointer select-none">
              <input v-model="b.v" type="checkbox" class="w-3.5 h-3.5 accent-[var(--color-brand)]" @change="syncFromPerm" />
              {{ b.label }}
            </label>
          </div>
          <span class="text-muted">{{ t('files.permGroup') }}</span>
          <div class="flex items-center gap-4">
            <label v-for="b in permRows[1]" :key="b.key" class="flex items-center gap-1.5 cursor-pointer select-none">
              <input v-model="b.v" type="checkbox" class="w-3.5 h-3.5 accent-[var(--color-brand)]" @change="syncFromPerm" />
              {{ b.label }}
            </label>
          </div>
          <span class="text-muted">{{ t('files.permOther') }}</span>
          <div class="flex items-center gap-4">
            <label v-for="b in permRows[2]" :key="b.key" class="flex items-center gap-1.5 cursor-pointer select-none">
              <input v-model="b.v" type="checkbox" class="w-3.5 h-3.5 accent-[var(--color-brand)]" @change="syncFromPerm" />
              {{ b.label }}
            </label>
          </div>
        </div>
        <div class="flex items-center gap-4 text-[12.5px]">
          <span class="text-muted w-[56px] shrink-0">{{ t('files.permSpecial') }}</span>
          <label v-for="b in specialRows" :key="b.key" class="flex items-center gap-1.5 cursor-pointer select-none">
            <input v-model="b.v" type="checkbox" class="w-3.5 h-3.5 accent-[var(--color-brand)]" @change="syncFromPerm" />
            {{ b.label }}
          </label>
        </div>
        <div class="flex items-center gap-2">
          <Input
            v-model="modeText"
            class="!w-28 !h-8 font-mono"
            :placeholder="t('files.propModePh')"
            @update:model-value="syncFromText"
            @keyup.enter="saveMode"
          />
          <span class="font-mono text-muted text-[12.5px]">0{{ modeBits.toString(8) }}</span>
          <Button size="sm" variant="brand" :disabled="!modeValid" :loading="savingMode" @click="saveMode">
            <Icon name="save" size="13" /> {{ t('files.propModeSave') }}
          </Button>
          <span v-if="!modeValid && modeText" class="text-[11px] text-danger">{{ t('files.propModeInvalid') }}</span>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '../Modal.vue'
import Icon from '../Icon.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { HostFile } from '../../types'
import { chmodFile } from '../../api/files'
import { formatBytes } from '../../util'
import { toastErr, toastOk } from '../../toast'
import type { IconName } from '../../icons'

const props = defineProps<{ open: boolean; entry: HostFile | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const { t } = useI18n()
const modeText = ref('')
const savingMode = ref(false)

// 勾选式权限(1Panel 风格):三组 读/写/执行 + 特殊位
interface PermBox { key: string; label: string; v: boolean }
const ownerPerm = reactive({ r: false, w: false, x: false })
const groupPerm = reactive({ r: false, w: false, x: false })
const otherPerm = reactive({ r: false, w: false, x: false })
const specialPerm = reactive({ suid: false, sgid: false, sticky: false })
const permRows = computed<PermBox[][]>(() => [
  [
    { key: 'or', label: t('files.permRead'), v: ownerPerm.r },
    { key: 'ow', label: t('files.permWrite'), v: ownerPerm.w },
    { key: 'ox', label: t('files.permExec'), v: ownerPerm.x },
  ],
  [
    { key: 'gr', label: t('files.permRead'), v: groupPerm.r },
    { key: 'gw', label: t('files.permWrite'), v: groupPerm.w },
    { key: 'gx', label: t('files.permExec'), v: groupPerm.x },
  ],
  [
    { key: 'or2', label: t('files.permRead'), v: otherPerm.r },
    { key: 'ow2', label: t('files.permWrite'), v: otherPerm.w },
    { key: 'ox2', label: t('files.permExec'), v: otherPerm.x },
  ],
])
const specialRows = computed<PermBox[]>(() => [
  { key: 'suid', label: 'SUID', v: specialPerm.suid },
  { key: 'sgid', label: 'SGID', v: specialPerm.sgid },
  { key: 'sticky', label: 'Sticky', v: specialPerm.sticky },
])

// 勾选 → 八进制位
const modeBits = computed(() => {
  const tri = (p: { r: boolean; w: boolean; x: boolean }, shift: number) => ((p.r ? 4 : 0) | (p.w ? 2 : 0) | (p.x ? 1 : 0)) << shift
  return (
    (specialPerm.suid ? 0o4000 : 0) |
    (specialPerm.sgid ? 0o2000 : 0) |
    (specialPerm.sticky ? 0o1000 : 0) |
    tri(ownerPerm, 6) |
    tri(groupPerm, 3) |
    tri(otherPerm, 0)
  )
})
const modeValid = computed(() => /^[0-7]{3,4}$/.test(modeText.value.trim()))

// 勾选变化 → 同步数字输入
function syncFromPerm() {
  modeText.value = modeBits.value.toString(8)
}
// 手动改数字 → 回填勾选
function syncFromText() {
  const v = modeText.value.trim()
  if (!/^[0-7]{3,4}$/.test(v)) return
  const bits = parseInt(v, 8)
  const set = (p: { r: boolean; w: boolean; x: boolean }, shift: number) => {
    const b = (bits >> shift) & 7
    p.r = !!(b & 4)
    p.w = !!(b & 2)
    p.x = !!(b & 1)
  }
  set(ownerPerm, 6)
  set(groupPerm, 3)
  set(otherPerm, 0)
  specialPerm.suid = !!(bits & 0o4000)
  specialPerm.sgid = !!(bits & 0o2000)
  specialPerm.sticky = !!(bits & 0o1000)
}

function typeLabel(type: HostFile['type']): string {
  const map: Record<HostFile['type'], string> = {
    file: t('files.typeFile'),
    directory: t('files.typeDirectory'),
    symlink: t('files.typeSymlink'),
    socket: t('files.typeSocket'),
    device: t('files.typeDevice'),
    fifo: t('files.typeFifo'),
    unknown: t('files.typeUnknown'),
  }
  return map[type] ?? t('files.typeUnknown')
}

function iconFor(e: HostFile): IconName {
  if (e.type === 'directory') return 'folder'
  if (e.type === 'symlink') return 'link'
  return 'fileText'
}

function formatTime(s: string): string {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

async function saveMode() {
  if (!props.entry || !modeValid.value) return
  savingMode.value = true
  try {
    await chmodFile(props.entry.path, modeText.value.trim())
    toastOk(t('files.propModeSaved'))
    emit('saved')
    emit('close')
  } catch (e) {
    toastErr(e instanceof Error ? e.message : t('files.errActionFailed'))
  } finally {
    savingMode.value = false
  }
}

function onModel(v: boolean) {
  if (!v) emit('close')
}

watch(
  () => [props.open, props.entry] as const,
  ([open, entry]) => {
    if (open && entry) {
      // mode 字段为十进制(如 493 = 0755):解析回填勾选
      const bits = entry.mode ?? 0
      const set = (p: { r: boolean; w: boolean; x: boolean }, shift: number) => {
        const b = (bits >> shift) & 7
        p.r = !!(b & 4)
        p.w = !!(b & 2)
        p.x = !!(b & 1)
      }
      set(ownerPerm, 6)
      set(groupPerm, 3)
      set(otherPerm, 0)
      specialPerm.suid = !!(bits & 0o4000)
      specialPerm.sgid = !!(bits & 0o2000)
      specialPerm.sticky = !!(bits & 0o1000)
      modeText.value = (bits & 0o777).toString(8).padStart(3, '0')
    }
  },
)
</script>
