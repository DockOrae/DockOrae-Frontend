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
// 文件管理器内嵌宿主终端弹窗(二级弹框;自动进入对应目录,不跳转侧边栏终端页)
import { onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import Modal from '../Modal.vue'
import Icon from '../Icon.vue'
import { Button } from '@/components/ui/button'
import { hostTerminalWsUrl } from '../../api/files'
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
let ws: WebSocket | null = null

function connect() {
  disconnect()
  error.value = ''
  try {
    ws = new WebSocket(hostTerminalWsUrl(props.cwd || '/root', 80, 24))
  } catch (e) {
    error.value = errorMessage(e)
    return
  }
  ws.onopen = () => sendResize()
  ws.onmessage = (ev) => {
    if (!term) return
    if (typeof ev.data === 'object') {
      term.write(new Uint8Array(ev.data))
    } else if (typeof ev.data === 'string') {
      if (ev.data.startsWith('[terminal failed')) {
        error.value = t('terminal.hostCantConnect')
        term.write(ev.data)
        return
      }
      if (ev.data.startsWith('{')) {
        try {
          const info = JSON.parse(ev.data) as { cwd?: string }
          if (info.cwd) emit('cwd', info.cwd)
        } catch {
          /* ignore */
        }
      } else {
        term.write(ev.data)
      }
    }
  }
  ws.onclose = () => {
    ws = null
    if (term) term.write(`\r\n\x1b[31m[${t('terminal.disconnected')}]\x1b[0m\r\n`)
  }
  ws.onerror = () => {
    error.value = t('terminal.hostCantConnect')
    ws?.close()
  }
}

function disconnect() {
  if (ws) {
    ws.onclose = null
    ws.close()
    ws = null
  }
}

function clearTerm() {
  term?.clear()
}

function sendResize() {
  if (ws && ws.readyState === WebSocket.OPEN && fit) {
    const { cols, rows } = fit.proposeDimensions() || { cols: 80, rows: 24 }
    ws.send(`resize:${cols},${rows}`)
  }
}

function onResize() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    fit?.fit()
    sendResize()
  }
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
        term.onData((d) => ws?.send(d))
        window.addEventListener('resize', onResize)
        connect()
      }, 50)
    } else {
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
  window.removeEventListener('resize', onResize)
  disconnect()
  term?.dispose()
  term = null
})
</script>
