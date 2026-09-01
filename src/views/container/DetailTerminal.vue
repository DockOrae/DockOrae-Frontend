<template>
  <div class="flex flex-col h-[520px]">
    <!-- 工具栏:状态 + 清空 -->
    <div class="flex items-center gap-2 mb-2 flex-wrap">
      <span class="text-[13px] font-semibold flex items-center gap-1.5">
        <Icon name="terminal" size="14" class="text-brand" />
        {{ t('terminal.containerTitle') }}
      </span>
      <span
        class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px]"
        :class="statusClass"
      >
        <span v-if="status === 'running'" class="inline-block w-2 h-2 rounded-full bg-brand animate-pulse" />
        <span v-else class="inline-block w-2 h-2 rounded-full" :class="dotClass" />
        {{ statusText }}
      </span>
      <div class="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="sm" :disabled="!blocks.length" @click="clearOutput">
          <Icon name="x" size="13" /> {{ t('terminal.clear') }}
        </Button>
      </div>
    </div>

    <!-- 输出区 -->
    <div ref="outEl" class="flex-1 code-panel border border-line rounded-lg overflow-y-auto p-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap break-all">
      <p v-if="!blocks.length" class="text-muted opacity-70">
        {{ t('terminal.containerHint') }}
      </p>
      <template v-for="(b, i) in blocks" :key="i">
        <div class="text-[#e5e7eb] select-text"><span class="text-brand select-none">$ </span>{{ b.cmd }}</div>
        <div v-if="b.stdout" class="text-[#c9d2e3]">{{ b.stdout }}</div>
        <div v-if="b.stderr" class="text-[#f87171]">{{ b.stderr }}</div>
        <div v-if="b.timedOut" class="text-[#fbbf24]">⚠ {{ t('terminal.timedOut', { seconds: b.timeoutSeconds }) }}</div>
        <div v-if="b.truncated" class="text-[#fbbf24]">⚠ {{ t('terminal.truncated') }}</div>
        <div v-if="b.error" class="text-[#f87171]">✕ {{ b.error }}</div>
        <div v-else-if="b.exitCode !== null" class="text-muted opacity-80">
          {{ t('terminal.exitCode', { code: b.exitCode }) }} · {{ b.durationMs }} ms
        </div>
        <div class="h-2" />
      </template>
      <div v-if="status === 'running'" class="flex items-center gap-2 text-brand">
        <span class="inline-block w-3 h-3 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
        {{ t('terminal.stateRunning') }}
      </div>
    </div>

    <!-- 输入区 -->
    <div class="mt-2">
      <div v-if="!running" class="mb-2 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
        <Icon name="alert" size="13" class="inline -mt-0.5 mr-1" />{{ t('terminal.notRunning') }}
      </div>
      <div class="flex items-start gap-2">
        <Textarea
          v-model="command"
          rows="2"
          class="flex-1 !font-mono !text-[12px] resize-none"
          :placeholder="t('terminal.inputPh')"
          :disabled="!running || status === 'running'"
          spellcheck="false"
          @keydown="onKey"
        />
        <Button variant="brand" size="sm" class="!h-[52px] !px-4" :disabled="!running || !command.trim() || status === 'running'" @click="run">
          <span v-if="status === 'running'" class="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          <Icon v-else name="play" size="13" />
          {{ t('terminal.execute') }}
        </Button>
      </div>
      <p class="text-[11px] text-muted mt-1.5">{{ t('terminal.execHint') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '../../components/Icon.vue'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { execContainer, type ContainerExecResult } from '../../api/containers'
import { errorMessage } from '../../util'

const { t } = useI18n()
const props = defineProps<{ id: string; running: boolean }>()

type ExecStatus = 'idle' | 'running' | 'success' | 'error' | 'timeout'

interface ExecBlock {
  cmd: string
  stdout: string
  stderr: string
  exitCode: number | null
  durationMs: number
  truncated: boolean
  timedOut: boolean
  timeoutSeconds: number
  error: string
}

const command = ref('')
const status = ref<ExecStatus>('idle')
const blocks = ref<ExecBlock[]>([])
const outEl = ref<HTMLElement | null>(null)
// 命令历史(内存,最近 20 条;刷新页面清空,符合产品约定)
const history = ref<string[]>([])
const histIdx = ref(-1)
let runSeq = 0

const statusText = computed(() => {
  const map: Record<ExecStatus, string> = {
    idle: t('terminal.stateIdle'),
    running: t('terminal.stateRunning'),
    success: t('terminal.stateSuccess'),
    error: t('terminal.stateError'),
    timeout: t('terminal.stateTimeout'),
  }
  return map[status.value]
})
const statusClass = computed(() => {
  const map: Record<ExecStatus, string> = {
    idle: 'border-line text-muted',
    running: 'border-brand/40 text-brand',
    success: 'border-ok/40 text-ok',
    error: 'border-danger/40 text-danger',
    timeout: 'border-warn/40 text-warn',
  }
  return map[status.value]
})
const dotClass = computed(() => {
  const map: Record<ExecStatus, string> = {
    idle: 'bg-muted',
    running: 'bg-brand',
    success: 'bg-ok',
    error: 'bg-danger',
    timeout: 'bg-warn',
  }
  return map[status.value]
})

async function run() {
  const cmd = command.value.trim()
  if (!cmd || status.value === 'running') return
  // 记录历史(去重相邻重复)
  if (history.value[history.value.length - 1] !== cmd) {
    history.value.push(cmd)
    if (history.value.length > 20) history.value.shift()
  }
  histIdx.value = -1
  command.value = ''
  status.value = 'running'
  const seq = ++runSeq
  try {
    const res: ContainerExecResult = await execContainer(props.id, cmd)
    if (seq !== runSeq) return // 组件已卸载/重置
    blocks.value.push({
      cmd,
      stdout: res.stdout || '',
      stderr: res.stderr || '',
      exitCode: res.exit_code,
      durationMs: res.duration_ms,
      truncated: res.truncated,
      timedOut: false,
      timeoutSeconds: 0,
      error: '',
    })
    status.value = res.exit_code === 0 ? 'success' : 'error'
  } catch (e) {
    if (seq !== runSeq) return
    const msg = errorMessage(e)
    const statusCode = (e as { status?: number }).status
    const timedOut = statusCode === 504 || /timeout|超时/i.test(msg)
    blocks.value.push({
      cmd,
      stdout: '',
      stderr: '',
      exitCode: null,
      durationMs: 0,
      truncated: false,
      timedOut,
      timeoutSeconds: 30,
      error: timedOut ? '' : msg,
    })
    status.value = timedOut ? 'timeout' : 'error'
  }
  await nextTick()
  scrollToBottom()
}

function scrollToBottom() {
  if (outEl.value) outEl.value.scrollTop = outEl.value.scrollHeight
}

function clearOutput() {
  blocks.value = []
  status.value = 'idle'
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    run()
    return
  }
  if (e.key === 'ArrowUp' && status.value !== 'running') {
    e.preventDefault()
    if (history.value.length && histIdx.value < history.value.length - 1) {
      histIdx.value++
      command.value = history.value[history.value.length - 1 - histIdx.value]
    }
    return
  }
  if (e.key === 'ArrowDown' && status.value !== 'running') {
    e.preventDefault()
    if (histIdx.value > 0) {
      histIdx.value--
      command.value = history.value[history.value.length - 1 - histIdx.value]
    } else {
      histIdx.value = -1
      command.value = ''
    }
  }
}

// 容器从运行变为停止:重置状态
watch(
  () => props.running,
  (r) => {
    if (!r && status.value === 'running') {
      runSeq++
      status.value = 'idle'
    }
  },
)

onBeforeUnmount(() => {
  runSeq++ // 使在途请求结果不再写入
})
</script>
