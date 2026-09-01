<template>
  <Modal :model-value="open" :title="t('files.terminalHere')" size="2xl" @close="onClose" @update:model-value="onModel">
    <div class="flex items-center gap-2 mb-2 flex-wrap">
      <span class="text-[11px] text-muted flex items-center gap-1.5 min-w-0">
        <Icon name="terminal" size="13" class="text-brand shrink-0" />
        {{ t('terminal.hostTitle') }}
        <span class="font-mono truncate">{{ cwd }}</span>
      </span>
      <span v-if="error" class="text-xs text-danger min-w-0 truncate">{{ error }}</span>
      <div class="ml-auto flex items-center gap-1 shrink-0">
        <Button variant="icon" :title="t('terminal.fontDec')" @click="fontSize--"><Icon name="minus" size="12" /></Button>
        <span class="text-[11px] text-muted w-5 text-center">{{ fontSize }}</span>
        <Button variant="icon" :title="t('terminal.fontInc')" @click="fontSize++"><Icon name="plus" size="12" /></Button>
        <Button variant="icon" :title="t('terminal.theme')" @click="dark = !dark"><Icon :name="dark ? 'sun' : 'moon'" size="12" /></Button>
        <Button variant="icon" :title="t('terminal.clear')" @click="clearTerm"><Icon name="x" size="12" /></Button>
      </div>
    </div>
    <div ref="termEl" class="h-[420px] bg-[#0a0d13] border border-line rounded-xl overflow-hidden p-2" />
  </Modal>
</template>

<script setup lang="ts">
// 文件管理器内嵌宿主终端弹窗(长轮询,KPanel 架构;自动进入对应目录,不跳转侧边栏终端页)
import { onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import Modal from '../Modal.vue'
import Icon from '../Icon.vue'
import { Button } from '@/components/ui/button'
import { terminalOpen, terminalOutput, terminalInput, terminalResize, terminalClose } from '../../api/terminal'
import { errorMessage } from '../../util'

const props = defineProps<{ open: boolean; cwd: string }>()
const emit = defineEmits<{ close: []; cwd: [string] }>()

const { t } = useI18n()
const termEl = ref<HTMLElement | null>(null)
const error = ref('')
const fontSize = ref(11)
const dark = ref(true)

let term: Terminal | null = null
let fit: FitAddon | null = null
let sessionId = ''
let offset = 0
let controller: AbortController | null = null
let inputBuf = ''
let inputTimer: ReturnType<typeof setTimeout> | undefined
let retryTimer: ReturnType<typeof setTimeout> | undefined
let disposed = false

function encodeB64(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return window.btoa(binary).replace(/=+$/, '')
}

function decodeB64(value: string): Uint8Array {
  const decoded = window.atob(value)
  return Uint8Array.from(decoded, (c) => c.charCodeAt(0))
}

async function flushInput() {
  if (!inputBuf || !sessionId) return
  const data = inputBuf
  inputBuf = ''
  try {
    await terminalInput(sessionId, encodeB64(data))
  } catch {
    term?.write(`\r\n\x1b[31m[${t('terminal.inputFailed')}]\x1b[0m\r\n`)
  }
}

function connect() {
  disconnect()
  error.value = ''
  if (!term) return
  term.write('\r\n\x1b[33m[connecting…]\x1b[0m\r\n')
  terminalOpen(24, 80, props.cwd || '/root')
    .then((session) => {
      if (disposed) return
      sessionId = session.sessionId
      offset = session.offset || 0
      emit('cwd', props.cwd || '/root')
      poll()
      sendResize()
    })
    .catch((e) => {
      const msg = errorMessage(e)
      term?.write(`\r\n\x1b[31m[${msg}]\x1b[0m\r\n`)
      error.value = msg
    })
}

function poll() {
  if (disposed || !sessionId) return
  controller?.abort()
  controller = new AbortController()
  terminalOutput(sessionId, offset, controller.signal)
    .then((chunk) => {
      if (disposed) return
      if (chunk.data) term?.write(decodeB64(chunk.data))
      offset = chunk.nextOffset
      if (chunk.exitError) term?.write(`\r\n\x1b[31m[${chunk.exitError}]\x1b[0m\r\n`)
      if (chunk.closed || chunk.exitedAt) {
        sessionId = ''
        return
      }
      void poll()
    })
    .catch((e: unknown) => {
      if (disposed || (e as { name?: string })?.name === 'AbortError') return
      // 指数退避重连
      retryTimer = setTimeout(() => poll(), 1000)
    })
}

function disconnect() {
  if (retryTimer) clearTimeout(retryTimer)
  controller?.abort()
  controller = null
  if (sessionId) {
    void terminalClose(sessionId).catch(() => undefined)
    sessionId = ''
  }
}

function clearTerm() {
  term?.clear()
}

function sendResize() {
  if (!fit || !sessionId) return
  const { cols, rows } = fit.proposeDimensions() || { cols: 80, rows: 24 }
  void terminalResize(sessionId, Math.max(2, Math.min(500, Math.round(rows))), Math.max(2, Math.min(1000, Math.round(cols)))).catch(() => undefined)
}

function onResize() {
  if (!fit) return
  fit.fit()
  sendResize()
}

function onClose() {
  disconnect()
  emit('close')
}
function onModel(v: boolean) {
  if (!v) onClose()
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      // 打开后等 Modal 渲染完成再初始化终端
      setTimeout(() => {
        if (!termEl.value) return
        disposed = false
        term = new Terminal({
          cursorBlink: true,
          fontSize: fontSize.value,
          fontFamily: 'Consolas, "Cascadia Code", monospace',
          theme: { background: '#0a0d13', foreground: '#d4d4d4', cursor: '#ec4899' },
          scrollback: 5000,
        })
        fit = new FitAddon()
        term.loadAddon(fit)
        term.open(termEl.value)
        fit.fit()
        term.onData((d) => {
          if (!sessionId) return
          inputBuf += d
          if (inputBuf.length >= 2048) void flushInput()
          else if (!inputTimer) inputTimer = setTimeout(() => { inputTimer = undefined; void flushInput() }, 30)
        })
        window.addEventListener('resize', onResize)
        connect()
      }, 50)
    } else {
      disposed = true
      disconnect()
      term?.dispose()
      term = null
      fit = null
      window.removeEventListener('resize', onResize)
    }
  },
)

watch(fontSize, (n) => {
  if (n < 9) fontSize.value = 9
  if (n > 24) fontSize.value = 24
  if (term) term.options.fontSize = fontSize.value
})

watch(dark, (d) => {
  if (!term) return
  term.options.theme = d
    ? { background: '#0a0d13', foreground: '#d4d4d4', cursor: '#ec4899' }
    : { background: '#ffffff', foreground: '#1f2937', cursor: '#ec4899' }
})

onBeforeUnmount(() => {
  disposed = true
  window.removeEventListener('resize', onResize)
  if (inputTimer) clearTimeout(inputTimer)
  disconnect()
  term?.dispose()
  term = null
})
</script>
