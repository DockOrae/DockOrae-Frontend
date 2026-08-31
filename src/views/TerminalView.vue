<template>
  <div class="flex flex-col gap-3 min-h-full">
    <!-- 工具栏 -->
    <div class="flex items-center gap-2 flex-wrap">
      <div class="flex items-center gap-1.5 rounded-md border border-line px-1 py-0.5">
        <Button variant="icon" :disabled="!hasSelection" :title="t('terminal.copy')" @click="copySel"><Icon name="copy" size="12" /></Button>
        <Button variant="icon" :disabled="!connected" :title="t('terminal.paste')" @click="pasteText"><Icon name="clipboard" size="12" /></Button>
        <span class="w-px h-3 bg-line mx-0.5" />
        <Button variant="icon" :title="t('terminal.fontDec')" @click="fontSize--"><Icon name="minus" size="12" /></Button>
        <span class="text-[11px] text-muted w-6 text-center">{{ fontSize }}</span>
        <Button variant="icon" :title="t('terminal.fontInc')" @click="fontSize++"><Icon name="plus" size="12" /></Button>
        <span class="w-px h-3 bg-line mx-0.5" />
        <Button variant="icon" :title="t('terminal.theme')" @click="dark = !dark"><Icon :name="dark ? 'sun' : 'moon'" size="12" /></Button>
        <Button variant="icon" :title="t('terminal.clear')" @click="clearScreen"><Icon name="x" size="12" /></Button>
      </div>
      <Button size="sm" :variant="connected ? 'destructive' : 'brand'" @click="toggle">
        <Icon :name="connected ? 'x' : 'refresh'" size="13" />
        {{ connected ? t('terminal.disconnect') : t('terminal.reconnect') }}
      </Button>
      <span class="text-[11px] text-muted flex items-center gap-1.5">
        <Icon name="terminal" size="13" class="text-brand" />
        {{ t('terminal.hostTitle') }}
        <span v-if="connected" class="font-mono">{{ cwd }}</span>
      </span>
      <span v-if="error" class="text-xs text-danger">{{ error }}</span>
    </div>

    <!-- Agent 离线:明确提示,不提供容器终端回退 -->
    <div
      v-if="offline"
      class="flex flex-col items-center justify-center gap-3 py-20 text-center border border-line rounded-xl bg-surface"
    >
      <div class="flex items-center justify-center w-14 h-14 rounded-2xl border border-line bg-surface2">
        <Icon name="terminal" size="26" class="text-muted" />
      </div>
      <div class="text-[15px] font-medium">{{ t('terminal.hostOffline') }}</div>
      <div class="text-[12.5px] text-muted max-w-md">{{ t('terminal.hostOfflineDesc') }}</div>
      <Button size="sm" variant="brand" @click="connect">
        <Icon name="refresh" size="13" /> {{ t('terminal.reconnect') }}
      </Button>
    </div>

    <div ref="termEl" v-show="!offline" class="flex-1 min-h-[420px] bg-[#0a0d13] border border-line rounded-xl overflow-hidden p-2" />

    <p class="text-[11px] text-muted">
      {{ t('terminal.hostHint') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import Icon from '../components/Icon.vue'
import { Button } from '@/components/ui/button'
import { hostTerminalWsUrl } from '../api/files'
import { errorMessage } from '../util'

const { t } = useI18n()
const route = useRoute()

const termEl = ref<HTMLElement | null>(null)
const connected = ref(false)
const offline = ref(false)
const error = ref('')
const hasSelection = ref(false)
const fontSize = ref(13)
const dark = ref(true)
const cwd = ref('/root')

let term: Terminal | null = null
let fit: FitAddon | null = null
let ws: WebSocket | null = null

function copySel() {
  const sel = term?.getSelection()
  if (!sel) return
  navigator.clipboard?.writeText(sel).catch(() => {})
}

async function pasteText() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  try {
    const text = await navigator.clipboard.readText()
    if (text) ws.send(text)
  } catch {
    /* 剪贴板权限拒绝时静默 */
  }
}

function connect() {
  disconnect()
  error.value = ''
  offline.value = false
  // 来自文件管理器的「在终端打开」:?cwd= 指定初始目录
  const q = typeof route.query.cwd === 'string' && route.query.cwd ? route.query.cwd : '/root'
  cwd.value = q
  try {
    ws = new WebSocket(hostTerminalWsUrl(q, 80, 24))
  } catch (e) {
    error.value = errorMessage(e)
    offline.value = true
    return
  }
  ws.onopen = () => {
    connected.value = true
    sendResize()
  }
  ws.onmessage = (ev) => {
    if (!term) return
    if (typeof ev.data === 'object') {
      term.write(new Uint8Array(ev.data))
    } else if (typeof ev.data === 'string') {
      // 会话信息首帧(JSON)或错误文本
      if (ev.data.startsWith('[terminal failed')) {
        // 面板 → Agent 拨号失败(Agent 离线等):明确显示,不提供容器终端回退
        error.value = t('terminal.hostCantConnect')
        offline.value = true
        connected.value = false
        term.write(ev.data)
        return
      }
      if (ev.data.startsWith('{')) {
        try {
          const info = JSON.parse(ev.data) as { cwd?: string; shell?: string; id?: string }
          if (info.cwd) cwd.value = info.cwd
        } catch {
          /* ignore */
        }
      } else {
        term.write(ev.data)
      }
    }
  }
  ws.onclose = () => {
    connected.value = false
    ws = null
    if (term) term.write(`\r\n\x1b[31m[${t('terminal.disconnected')}]\x1b[0m\r\n`)
  }
  ws.onerror = () => {
    error.value = t('terminal.hostCantConnect')
    offline.value = true
    ws?.close()
  }
}

function disconnect() {
  if (ws) {
    ws.onclose = null
    ws.close()
    ws = null
  }
  connected.value = false
}

function sendResize() {
  if (ws && ws.readyState === WebSocket.OPEN && fit) {
    const { cols, rows } = fit.proposeDimensions() || { cols: 80, rows: 24 }
    ws.send(`resize:${cols},${rows}`)
  }
}

function toggle() {
  if (connected.value) disconnect()
  else connect()
}

function clearScreen() {
  term?.clear()
}

onMounted(() => {
  term = new Terminal({
    cursorBlink: true,
    fontSize: fontSize.value,
    fontFamily: 'Consolas, "Cascadia Code", monospace',
    theme: { background: '#0a0d13', foreground: '#d4d4d4', cursor: '#ec4899' },
    scrollback: 5000,
  })
  fit = new FitAddon()
  term.loadAddon(fit)
  term.open(termEl.value!)
  fit.fit()
  term.onData((d) => ws?.send(d))
  term.onSelectionChange(() => {
    hasSelection.value = !!term?.getSelection()
  })
  window.addEventListener('resize', onResize)
  connect()
})

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

function onResize() {
  if (connected.value) {
    fit?.fit()
    sendResize()
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  disconnect()
  term?.dispose()
})
</script>
