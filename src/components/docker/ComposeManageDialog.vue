<template>
  <Modal :model-value="open" :title="project" size="2xl" @close="close">
    <div v-if="data" class="space-y-4">
      <!-- 头部操作 -->
      <div class="flex items-center gap-2 flex-wrap">
        <StatusBadge :state="status" />
        <Badge v-if="data.managed" variant="success">{{ t('composeDetail.managedBadge') }}</Badge>
        <Badge v-else variant="warning">{{ t('composeDetail.notManagedBadge') }}</Badge>
        <div class="ml-auto flex items-center gap-1.5 flex-wrap">
          <Button v-if="status !== 'running'" variant="ok" size="sm" @click="act('start')"><Icon name="play" size="12" /> {{ t('common.start') }}</Button>
          <Button v-if="status === 'running'" variant="ghost" size="sm" @click="act('stop')"><Icon name="stop" size="12" /> {{ t('common.stop') }}</Button>
          <Button variant="ghost" size="sm" @click="act('restart')"><Icon name="restart" size="12" /> {{ t('common.restart') }}</Button>
          <Button variant="ghost" size="sm" @click="down"><Icon name="x" size="12" /> {{ t('composeDetail.down') }}</Button>
          <Button variant="destructive" size="sm" @click="remove"><Icon name="trash" size="12" /> {{ t('common.delete') }}</Button>
        </div>
      </div>

      <!-- 标签页 -->
      <div class="flex gap-1 border-b border-line">
        <button
          v-for="tabItem in tabs"
          :key="tabItem.key"
          class="px-3.5 py-2 text-[13px] font-medium rounded-t-lg transition-colors -mb-px border-b-2 cursor-pointer"
          :class="tab === tabItem.key ? 'text-brand border-brand' : 'text-muted hover:text-text border-transparent'"
          @click="tab = tabItem.key"
        >
          {{ t(tabItem.labelKey) }}
        </button>
      </div>

      <!-- 编排文件 -->
      <div v-if="tab === 'file'">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-semibold font-mono">docker-compose.yml</span>
          <Button v-if="data.managed" variant="brand" size="sm" :disabled="saving" @click="save">
            <Icon name="check" size="13" /> {{ t('composeDetail.saveDeploy') }}
          </Button>
        </div>
        <Textarea v-model="yamlText" rows="16" spellcheck="false" :disabled="!data.managed" class="font-mono !text-[12px]" />
        <div v-if="!data.managed" class="mt-3 rounded-lg border border-line bg-surface2/50 p-3">
          <p class="text-xs text-muted mb-2">{{ t('composeDetail.adoptDesc') }}</p>
          <Button variant="brand" size="sm" :disabled="adopting || !yamlText.trim()" @click="adopt">
            {{ t('composeDetail.adopt') }}
          </Button>
          <p v-if="adoptErr" class="text-xs text-danger mt-2">{{ adoptErr }}</p>
        </div>
        <!-- 保存/部署过程输出 -->
        <div v-if="saving || outputLines.length" class="mt-3 code-panel border border-line rounded-lg p-3 max-h-44 overflow-y-auto font-mono text-[11px] whitespace-pre-wrap" :class="saveFailed ? 'text-danger' : 'text-muted'">
          <template v-if="saving">
            <div class="flex items-center gap-2 mb-1.5 text-brand">
              <span class="inline-block w-3 h-3 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
              {{ t('compose.deploying') }}
            </div>
          </template>
          <div v-for="(l, i) in outputLines" :key="i" class="leading-relaxed break-all">{{ l }}</div>
          <div v-if="saveFailed" class="text-danger font-semibold pt-1">{{ t('compose.deployFailed') }}</div>
        </div>
      </div>

      <!-- 容器 -->
      <div v-else-if="tab === 'containers'" class="overflow-x-auto -mx-1 px-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{{ t('composeDetail.thService') }}</TableHead>
              <TableHead>{{ t('composeDetail.thContainer') }}</TableHead>
              <TableHead>{{ t('composeDetail.thStatus') }}</TableHead>
              <TableHead>{{ t('composeDetail.thPorts') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="c in data.containers" :key="c.Id" class="cursor-pointer" @click="$router.push('/containers/' + c.Id)">
              <TableCell class="font-medium">{{ c.Labels?.['com.docker.compose.service'] || '-' }}</TableCell>
              <TableCell>{{ name(c) }}</TableCell>
              <TableCell><StatusBadge :state="c.State" /></TableCell>
              <TableCell class="text-muted text-[12px]">{{ ports(c) }}</TableCell>
            </TableRow>
            <TableRow v-if="!data.containers.length">
              <TableCell colspan="4" class="text-center text-muted py-8">{{ t('composeDetail.noContainers') }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- 日志 -->
      <div v-else-if="tab === 'logs'" class="code-panel border border-line rounded-lg p-3 h-72 overflow-y-auto">
        <LogViewer :stream="`/compose/${project}/logs`" follow />
      </div>
    </div>
    <div v-else class="py-10 text-center text-muted text-sm">{{ t('common.loading') }}</div>

    <template #footer>
      <Button variant="ghost" size="sm" @click="close">{{ t('common.close') }}</Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '../Icon.vue'
import Modal from '../Modal.vue'
import StatusBadge from '../StatusBadge.vue'
import LogViewer from '../LogViewer.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { adoptCompose, composeAction, inspectCompose, removeCompose, updateCompose, type ComposeAction } from '../../api'
import { containerName, errorMessage, humanPorts } from '../../util'
import { useConfirm } from '../../confirm'
import { toastErr, toastOk } from '../../toast'
import type { ComposeInspect, ComposeStackStatus, ContainerListItem } from '../../types'

const { t } = useI18n()
const props = defineProps<{ open: boolean; project: string }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'changed'): void }>()
const confirm = useConfirm()

const data = ref<ComposeInspect | null>(null)
const yamlText = ref('')
const tab = ref('file')
const saving = ref(false)
const saveFailed = ref(false)
const outputLines = ref<string[]>([])
const adopting = ref(false)
const adoptErr = ref('')

const tabs = [
  { key: 'file', labelKey: 'composeDetail.tabFile' },
  { key: 'containers', labelKey: 'composeDetail.tabContainers' },
  { key: 'logs', labelKey: 'composeDetail.tabLogs' },
]

const status = ref<ComposeStackStatus>('stopped')
const name = (c: ContainerListItem) => containerName(c)
const ports = (c: ContainerListItem) => humanPorts(c.Ports)

async function load() {
  try {
    data.value = await inspectCompose(props.project)
    yamlText.value = data.value.yaml || ''
    const cs = data.value.containers || []
    if (!cs.length) status.value = 'stopped'
    else {
      const running = cs.filter((c) => c.State === 'running').length
      status.value = running === 0 ? 'stopped' : running === cs.length ? 'running' : 'partial'
    }
  } catch (e) {
    toastErr(errorMessage(e))
    emit('close')
  }
}

async function act(action: ComposeAction) {
  try {
    await composeAction(props.project, action)
    const msgs: Record<string, string> = {
      start: t('compose.toastStarted'),
      stop: t('compose.toastStopped'),
      restart: t('compose.toastRestarted'),
      down: t('composeDetail.toastDownOk'),
    }
    toastOk(msgs[action])
    emit('changed')
    load()
  } catch (e) {
    toastErr(errorMessage(e))
  }
}

async function save() {
  saving.value = true
  saveFailed.value = false
  outputLines.value = []
  try {
    await updateCompose(props.project, { project: props.project, yaml: yamlText.value }, (line) => {
      outputLines.value.push(line)
    })
    toastOk(t('composeDetail.toastDeployOk'))
    emit('changed')
    load()
  } catch (e) {
    saveFailed.value = true
    outputLines.value.push(`❌ ${errorMessage(e)}`)
    toastErr(errorMessage(e))
  } finally {
    saving.value = false
  }
}

async function adopt() {
  adopting.value = true
  adoptErr.value = ''
  try {
    await adoptCompose(props.project, { yaml: yamlText.value })
    toastOk(t('composeDetail.adopted'))
    emit('changed')
    load()
  } catch (e) {
    adoptErr.value = errorMessage(e)
  } finally {
    adopting.value = false
  }
}

async function down() {
  const ok = await confirm(t('composeDetail.confirmDown', { project: props.project }), {
    title: t('composeDetail.downTitle'),
    confirmText: t('composeDetail.down'),
  })
  if (!ok) return
  try {
    await composeAction(props.project, 'down')
    toastOk(t('composeDetail.toastDownOk'))
    emit('changed')
    emit('close')
  } catch (e) {
    toastErr(errorMessage(e))
  }
}

async function remove() {
  const ok = await confirm(t('composeDetail.confirmRemove', { project: props.project }), {
    title: t('composeDetail.removeTitle'),
    confirmText: t('common.delete'),
  })
  if (!ok) return
  try {
    await removeCompose(props.project)
    toastOk(t('composeDetail.toastRemoved'))
    emit('changed')
    emit('close')
  } catch (e) {
    toastErr(errorMessage(e))
  }
}

function close() {
  emit('close')
}

watch(
  () => [props.open, props.project] as const,
  ([open, project]) => {
    if (open && project) {
      tab.value = 'file'
      outputLines.value = []
      data.value = null
      load()
    }
  },
  { immediate: true },
)
</script>
