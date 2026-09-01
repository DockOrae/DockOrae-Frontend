<template>
  <div class="space-y-4 fade-up">
    <!-- 工具栏 -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted"><Icon name="search" size="14" /></span>
        <Input v-model="keyword" class="!w-64 !pl-9" :placeholder="t('containers.searchPh')" />
      </div>
      <Select v-model="stateFilter" nullable-value="__all__" class="!w-36">
        <SelectTrigger class="!w-36">
          <SelectValue :placeholder="t('common.allStates')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{{ t('common.allStates') }}</SelectItem>
          <SelectItem value="running">{{ t('common.running') }}</SelectItem>
          <SelectItem value="exited">{{ t('common.exited') }}</SelectItem>
          <SelectItem value="paused">{{ t('common.paused') }}</SelectItem>
          <SelectItem value="restarting">{{ t('common.restarting') }}</SelectItem>
        </SelectContent>
      </Select>
      <div class="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" @click="load">
          <Icon name="refresh" size="13" /> {{ t('common.refresh') }}
        </Button>
        <Button v-if="!licenseActive" variant="ghost" size="sm" class="!text-amber-400 border-amber-400/40" :title="t('license.requiredHint')" @click="$router.push('/settings#license')">
          <Icon name="lock" size="14" /> {{ t('compose.newStack') }}
        </Button>
        <Button v-else variant="ghost" size="sm" @click="createOpen = true">
          <Icon name="compose" size="13" /> {{ t('compose.newStack') }}
        </Button>
        <router-link :class="buttonVariants({ variant: 'brand', size: 'sm' })" to="/containers/new">
          <Icon name="plus" size="14" /> {{ t('containers.newContainer') }}
        </router-link>
      </div>
    </div>

    <!-- 分组列表 -->
    <div class="space-y-3">
      <Card v-for="g in groups" :key="g.id" class="overflow-hidden">
        <!-- 组头 -->
        <div
          class="flex items-center gap-2.5 px-4 py-3 cursor-pointer select-none hover:bg-surface2/50 transition-colors"
          @click="toggleGroup(collapseKey(g))"
        >
          <Icon :name="isCollapsed(collapseKey(g)) ? 'chevronRight' : 'chevronDown'" size="14" class="text-muted shrink-0" />
          <Icon :name="g.type === 'compose' ? 'layers' : 'box'" size="14" class="text-brand shrink-0" />
          <span class="font-semibold text-[14px]">{{ groupName(g) }}</span>
          <span class="text-[11px] text-muted shrink-0">{{ t('containers.groupCount', { count: g.containers.length }) }}</span>
          <StatusBadge :state="groupStatus(g)" />
          <span
            v-if="g.type === 'compose'"
            class="text-[10.5px] rounded-full border px-2 py-px shrink-0"
            :class="isManaged(g.id) ? 'border-ok/40 text-ok' : 'border-line text-muted'"
          >
            {{ isManaged(g.id) ? t('composeDetail.managedBadge') : t('composeDetail.notManagedBadge') }}
          </span>
          <!-- 组操作 -->
          <div class="ml-auto flex items-center gap-1.5" @click.stop>
            <template v-if="g.type === 'compose'">
              <Button variant="ghost" size="sm" @click="manageCompose(g.id)">
                <Icon :name="isManaged(g.id) ? 'edit' : 'download'" size="12" />
                {{ isManaged(g.id) ? t('common.manage') : t('composeDetail.adopt') }}
              </Button>
              <template v-if="isManaged(g.id)">
                <Button v-if="groupStatus(g) !== 'running'" variant="ok" size="sm" @click="stackAct(g.id, 'start')">
                  <Icon name="play" size="12" /> {{ t('common.startAll') }}
                </Button>
                <Button v-if="groupStatus(g) === 'running'" variant="ghost" size="sm" @click="stackAct(g.id, 'stop')">
                  <Icon name="stop" size="12" /> {{ t('common.stopAll') }}
                </Button>
                <Button variant="ghost" size="sm" @click="stackAct(g.id, 'restart')">
                  <Icon name="restart" size="12" /> {{ t('common.restartAll') }}
                </Button>
              </template>
            </template>
          </div>
        </div>

        <!-- 组内容:容器行 -->
        <div v-show="!isCollapsed(collapseKey(g))" class="border-t border-line">
          <div v-for="c in g.containers" :key="c.Id" class="flex items-center gap-3 px-4 py-2.5 border-b border-line/60 last:border-b-0 hover:bg-surface2/40 transition-colors cursor-pointer group" @click="$router.push('/containers/' + c.Id)">
            <div class="min-w-0 flex-1">
              <div class="font-medium text-[13px] truncate flex items-center gap-2">
                {{ name(c) }}
                <span v-if="c.Labels?.['com.docker.compose.service']" class="text-[10.5px] text-muted rounded border border-line px-1.5 py-px shrink-0">
                  {{ c.Labels['com.docker.compose.service'] }}
                </span>
              </div>
              <div class="text-[11px] text-muted truncate">{{ c.Image }}</div>
            </div>
            <div class="hidden md:block text-muted text-[11.5px] max-w-[220px] truncate shrink-0">{{ ports(c) }}</div>
            <div class="w-20 shrink-0"><StatusBadge :state="c.State" /></div>
            <div class="text-muted text-[11px] w-32 shrink-0 hidden lg:block">{{ formatDate(c.Created) }}</div>
            <!-- 行内操作 -->
            <div class="flex items-center gap-1 shrink-0" @click.stop>
              <Button v-if="c.State === 'running'" variant="icon" :title="t('containerDetail.tabTerminal')" @click="openExec(c)">
                <Icon name="terminal" size="13" />
              </Button>
              <Button v-if="c.State !== 'running' && c.State !== 'paused'" variant="icon" :title="t('common.start')" @click="act(c, 'start')">
                <Icon name="play" size="13" class="text-ok" />
              </Button>
              <Button v-if="c.State === 'running'" variant="icon" :title="t('common.pause')" @click="act(c, 'pause')">
                <Icon name="pause" size="13" />
              </Button>
              <Button v-if="c.State === 'running'" variant="icon" :title="t('common.restart')" @click="act(c, 'restart')">
                <Icon name="restart" size="13" />
              </Button>
              <Button v-if="c.State === 'paused'" variant="icon" :title="t('common.unpause')" @click="act(c, 'unpause')">
                <Icon name="play" size="13" class="text-ok" />
              </Button>
              <Button variant="icon" class="text-danger" :title="t('common.delete')" @click="remove(c)">
                <Icon name="trash" size="13" />
              </Button>
            </div>
          </div>
          <div v-if="!g.containers.length" class="px-4 py-8 text-center text-muted text-sm">
            {{ t('containers.noContainers') }}
          </div>
        </div>
      </Card>

      <Card v-if="!groups.length" class="p-12 text-center text-muted text-sm">
        <Icon name="container" size="32" class="mx-auto mb-3 opacity-40" />
        {{ t('containers.noContainers') }}
      </Card>
    </div>

    <!-- 新建 Compose 栈 -->
    <Modal :model-value="createOpen" :title="t('compose.createTitle')" @close="createOpen = false">
      <div class="space-y-3">
        <div>
          <Label>{{ t('compose.projectName') }}</Label>
          <Input v-model="form.project" :placeholder="t('compose.projectPh')" />
        </div>
        <div>
          <Label>{{ t('compose.yamlLabel') }}</Label>
          <Textarea
            v-model="form.yaml"
            rows="12"
            spellcheck="false"
            :placeholder="t('compose.yamlPh')"
          />
        </div>
        <div v-if="deploying || output" class="code-panel border border-line rounded-lg p-3 max-h-52 overflow-y-auto font-mono text-[11px] whitespace-pre-wrap" :class="deployFailed ? 'text-danger' : 'text-muted'">
          <template v-if="deploying">
            <div class="flex items-center gap-2 mb-1.5 text-brand">
              <span class="inline-block w-3 h-3 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
              {{ t('compose.deploying') }}
            </div>
          </template>
          <div v-for="(l, i) in outputLines" :key="i" class="leading-relaxed break-all">{{ l }}</div>
          <div v-if="deployFailed" class="text-danger font-semibold pt-1">{{ t('compose.deployFailed') }}</div>
        </div>
      </div>
      <template #footer>
        <Button variant="ghost" size="sm" :disabled="deploying" @click="createOpen = false">{{ t('common.cancel') }}</Button>
        <Button variant="brand" size="sm" :disabled="!form.project || !form.yaml.trim() || deploying" @click="deploy">
          <span v-if="deploying" class="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          {{ deploying ? t('compose.deploying') : t('compose.deploy') }}
        </Button>
      </template>
    </Modal>

    <!-- Compose 管理(编辑/容器/日志/接管) -->
    <ComposeManageDialog :open="manageOpen" :project="manageProject" @close="manageOpen = false" @changed="onStackChanged" />

    <!-- 容器终端(输入命令 → 执行 → 输出) -->
    <ContainerExecDialog :open="execOpen" :id="execId" :name="execName" :running="execRunning" @close="execOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '../components/Icon.vue'
import StatusBadge from '../components/StatusBadge.vue'
import Modal from '../components/Modal.vue'
import ComposeManageDialog from '../components/docker/ComposeManageDialog.vue'
import ContainerExecDialog from '../components/docker/ContainerExecDialog.vue'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { api, deployCompose, wsUrl } from '../api'
import { containerName, errorMessage, formatDate, humanPorts } from '../util'
import { useConfirm } from '../confirm'
import { toastErr, toastOk } from '../toast'
import { licenseActive } from '../store'
import type { ComposeProject, ContainerListItem } from '../types'

const { t } = useI18n()
const containers = ref<ContainerListItem[]>([])
const keyword = ref('')
const stateFilter = ref('')
const confirm = useConfirm()
const createOpen = ref(false)
const deploying = ref(false)
const deployFailed = ref(false)
const outputLines = ref<string[]>([])
const output = computed(() => outputLines.value.length > 0)
const form = reactive({ project: '', yaml: '' })

// Compose 管理弹窗
const manageOpen = ref(false)
const manageProject = ref('')
// 容器终端弹窗
const execOpen = ref(false)
const execId = ref('')
const execName = ref('')
// 与容器列表实时绑定:外部 docker stop 经事件流刷新列表后,弹窗内自动禁用(§11/测试6)
const execRunning = computed(() => {
  if (!execId.value) return false
  const c = containers.value.find((x) => x.Id === execId.value)
  return c ? c.State === 'running' : false
})

// 面板托管的 compose 项目(分组头显示「编辑」/组操作)
const managedProjects = ref<Set<string>>(new Set())

// ---------------- 分组 ----------------

type GroupStatus = 'running' | 'partial' | 'stopped' | 'empty'

interface ContainerGroup {
  type: 'compose' | 'standalone'
  id: string
  name: string
  containers: ContainerListItem[]
}

const collapsed = ref<Set<string>>(new Set())

function isCollapsed(id: string): boolean {
  return collapsed.value.has(id)
}

function toggleGroup(id: string) {
  const next = new Set(collapsed.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  collapsed.value = next
}

/** 折叠状态 key:compose/standalone 命名空间隔离(防 project 名与保留 id 撞车) */
function collapseKey(g: ContainerGroup): string {
  return g.type === 'compose' ? 'c:' + g.id : 's:' + g.id
}

/** 按 compose 标签实时分组(com.docker.compose.project 相同 → 同组;其余进「独立容器」UI 分组)。
 *  分组 id 直接用原始 project 名(唯一),可直接用于 compose API 调用。 */
function groupContainers(list: ContainerListItem[]): ContainerGroup[] {
  const byProject = new Map<string, ContainerListItem[]>()
  const standalone: ContainerListItem[] = []
  for (const c of list) {
    const proj = c.Labels?.['com.docker.compose.project']
    if (proj) {
      const arr = byProject.get(proj) || []
      arr.push(c)
      byProject.set(proj, arr)
    } else {
      standalone.push(c)
    }
  }
  const groups: ContainerGroup[] = []
  for (const [proj, arr] of [...byProject.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    groups.push({
      type: 'compose',
      id: proj,
      name: proj,
      containers: arr.sort((a, b) => containerName(a).localeCompare(containerName(b))),
    })
  }
  if (standalone.length) {
    groups.push({
      type: 'standalone',
      id: STANDALONE_GROUP_ID,
      name: t('containers.standaloneGroup'),
      containers: standalone.sort((a, b) => containerName(a).localeCompare(containerName(b))),
    })
  }
  return groups
}

/** 独立容器 UI 分组 id(与 compose project 命名空间隔离) */
const STANDALONE_GROUP_ID = '__standalone__'

function groupStatus(g: ContainerGroup): GroupStatus {
  const cs = g.containers
  if (!cs.length) return 'empty'
  const running = cs.filter((c) => c.State === 'running').length
  if (running === cs.length) return 'running'
  if (running === 0) return 'stopped'
  return 'partial'
}

function groupName(g: ContainerGroup): string {
  return g.type === 'compose' ? g.name : t('containers.standaloneGroup')
}

const groups = computed(() => {
  let list = containers.value
  if (stateFilter.value) list = list.filter((c) => c.State === stateFilter.value)
  if (keyword.value) {
    const k = keyword.value.toLowerCase()
    list = list.filter((c) => containerName(c).toLowerCase().includes(k) || c.Image?.toLowerCase().includes(k))
  }
  return groupContainers(list)
})

// ---------------- 数据加载 ----------------

async function load() {
  try {
    containers.value = await api<ContainerListItem[]>('/containers')
  } catch (e) {
    toastErr(errorMessage(e))
  }
  // 面板托管项目列表(分组头「编辑」/组操作开关)
  try {
    const stacks = await api<ComposeProject[]>('/compose')
    managedProjects.value = new Set(stacks.map((s) => s.project))
  } catch {
    managedProjects.value = new Set()
  }
}

function isManaged(project: string): boolean {
  return managedProjects.value.has(project)
}

// ---------------- Docker 事件实时刷新 ----------------
// 监听容器生命周期事件(start/stop/die/destroy/pause/unpause/create)→ 防抖刷新快照,
// 不轮询整个容器列表(§28)。

let evWS: WebSocket | null = null
let evTimer: ReturnType<typeof setTimeout> | null = null
let evReconnect: ReturnType<typeof setTimeout> | null = null
const EV_ACTIONS = new Set(['start', 'stop', 'die', 'destroy', 'pause', 'unpause', 'create'])

function connectEvents() {
  try {
    evWS = new WebSocket(wsUrl('/docker-events'))
  } catch {
    return
  }
  evWS.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data as string) as { Action?: string }
      if (msg.Action && EV_ACTIONS.has(msg.Action)) scheduleReload()
    } catch {
      /* 忽略脏帧 */
    }
  }
  evWS.onclose = () => {
    evWS = null
    if (evReconnect) clearTimeout(evReconnect)
    evReconnect = setTimeout(connectEvents, 3000)
  }
  evWS.onerror = () => {
    try {
      evWS?.close()
    } catch {
      /* noop */
    }
  }
}

function scheduleReload() {
  if (evTimer) clearTimeout(evTimer)
  evTimer = setTimeout(load, 400)
}

function disconnectEvents() {
  if (evTimer) clearTimeout(evTimer)
  if (evReconnect) clearTimeout(evReconnect)
  if (evWS) {
    evWS.onclose = null
    try {
      evWS.close()
    } catch {
      /* noop */
    }
    evWS = null
  }
}

// ---------------- 容器操作 ----------------

const name = (c: ContainerListItem) => containerName(c)
const ports = (c: ContainerListItem) => humanPorts(c.Ports)

type ContainerAct = 'start' | 'stop' | 'restart' | 'pause' | 'unpause'

const actionMap: Record<ContainerAct, () => string> = {
  start: () => t('containers.toastStarted'),
  stop: () => t('containers.toastStopped'),
  restart: () => t('containers.toastRestarted'),
  pause: () => t('containers.toastPaused'),
  unpause: () => t('containers.toastResumed'),
}

async function act(c: ContainerListItem, action: ContainerAct) {
  try {
    await api(`/containers/${c.Id}/${action}`, { method: 'POST' })
    toastOk(actionMap[action]())
    load()
  } catch (e) {
    toastErr(errorMessage(e))
  }
}

async function remove(c: ContainerListItem) {
  const ok = await confirm(t('containers.confirmDelete', { name: name(c) }), {
    title: t('containers.confirmDeleteTitle'),
    confirmText: t('common.delete'),
  })
  if (!ok) return
  try {
    await api(`/containers/${c.Id}?force=true`, { method: 'DELETE' })
    toastOk(t('common.deleted'))
    load()
  } catch (e) {
    toastErr(errorMessage(e))
  }
}

function openExec(c: ContainerListItem) {
  execId.value = c.Id
  execName.value = name(c)
  execOpen.value = true
}

// ---------------- Compose 操作 ----------------

function manageCompose(project: string) {
  manageProject.value = project
  manageOpen.value = true
}

function onStackChanged() {
  load()
}

type StackAct = 'start' | 'stop' | 'restart'

async function stackAct(project: string, action: StackAct) {
  try {
    await api(`/compose/${project}/${action}`, { method: 'POST' })
    toastOk({ start: t('compose.toastStarted'), stop: t('compose.toastStopped'), restart: t('compose.toastRestarted') }[action])
    load()
  } catch (e) {
    toastErr(errorMessage(e))
  }
}

async function deploy() {
  deploying.value = true
  deployFailed.value = false
  outputLines.value = []
  try {
    await deployCompose({ project: form.project, yaml: form.yaml }, (line: string) => {
      outputLines.value.push(line)
    })
    toastOk(t('compose.toastDeployOk'))
    createOpen.value = false
    form.project = ''
    form.yaml = ''
    load()
  } catch (e) {
    deployFailed.value = true
    outputLines.value.push(`❌ ${errorMessage(e)}`)
    toastErr(errorMessage(e))
  } finally {
    deploying.value = false
  }
}

onMounted(() => {
  load()
  connectEvents()
})
onBeforeUnmount(disconnectEvents)
</script>
