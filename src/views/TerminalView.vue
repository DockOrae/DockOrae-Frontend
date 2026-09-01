<template>
  <div class="flex flex-col gap-3 min-h-full" :class="{ 'term-fullscreen': fullscreen }">
    <!-- 工具栏 -->
    <div class="flex items-center gap-2 flex-wrap">
      <!-- 终端 Tabs -->
      <div class="flex items-center gap-1 rounded-md border border-line px-1 py-0.5 overflow-x-auto max-w-[46%]">
        <button
          v-for="t in tabs"
          :key="t.id"
          class="term-tab shrink-0"
          :class="t.id === activeId ? 'term-tab-active' : ''"
          :title="t.cwd"
          @click="switchTab(t.id)"
          @mousedown.middle.prevent="closeTab(t.id)"
        >
          <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="t.connected ? 'bg-emerald-500' : t.offline ? 'bg-danger' : 'bg-muted'" />
          <span class="max-w-[120px] truncate">{{ t.title }}</span>
          <span
            v-if="tabs.length > 1"
            class="w-3.5 h-3.5 rounded hover:bg-danger/20 hover:text-danger text-[12px] leading-none flex items-center justify-center shrink-0"
            @click.stop="closeTab(t.id)"
          >×</span>
        </button>
        <button class="term-tab shrink-0 text-muted hover:text-brand" :title="t('terminal.newTab')" @click="newTab()">+</button>
      </div>

      <div class="flex items-center gap-1.5 rounded-md border border-line px-1 py-0.5">
        <Button variant="icon" :disabled="!active.connected" :title="t('terminal.copy')" @click="copySel"><Icon name="copy" size="12" /></Button>
        <Button variant="icon" :disabled="!active.connected" :title="t('terminal.paste')" @click="pasteText"><Icon name="clipboard" size="12" /></Button>
        <span class="w-px h-3 bg-line mx-0.5" />
        <Button variant="icon" :title="t('terminal.fontDec')" @click="fontSize--"><Icon name="minus" size="12" /></Button>
        <span class="text-[11px] text-muted w-6 text-center">{{ fontSize }}</span>
        <Button variant="icon" :title="t('terminal.fontInc')" @click="fontSize++"><Icon name="plus" size="12" /></Button>
        <span class="w-px h-3 bg-line mx-0.5" />
        <Button variant="icon" :title="t('terminal.theme')" @click="dark = !dark"><Icon :name="dark ? 'sun' : 'moon'" size="12" /></Button>
        <Button variant="icon" :title="t('terminal.clear')" @click="clearScreen"><Icon name="x" size="12" /></Button>
      </div>

      <Button size="sm" :variant="active.connected ? 'destructive' : 'brand'" @click="toggleActive">
        <Icon :name="active.connected ? 'x' : 'refresh'" size="13" />
        {{ active.connected ? t('terminal.disconnect') : t('terminal.reconnect') }}
      </Button>
      <Button size="sm" variant="outline" :title="t('terminal.openDir')" :disabled="!active.cwd" @click="openInFiles">
        <Icon name="folder" size="13" /> {{ active.cwd || '—' }}
      </Button>
      <Button size="sm" variant="outline" :title="fullscreen ? t('terminal.exitFullscreen') : t('terminal.fullscreen')" @click="toggleFullscreen">
        <Icon :name="fullscreen ? 'minimize' : 'maximize'" size="13" />
      </Button>

      <span v-if="active.reconnecting" class="text-[11px] text-amber-500">
        {{ active.retryDelay ? t('terminal.reconnecting', { n: Math.ceil(active.retryDelay / 1000) }) : t('terminal.reconnectingNow') }}
      </span>
      <span v-if="active.error && !active.offline" class="text-xs text-danger">{{ active.error }}</span>
    </div>

    <!-- Agent 离线:明确提示,不提供容器终端回退 -->
    <div
      v-if="active.offline"
      class="flex flex-col items-center justify-center gap-3 py-20 text-center border border-line rounded-xl bg-surface"
    >
      <div class="flex items-center justify-center w-14 h-14 rounded-2xl border border-line bg-surface2">
        <Icon name="terminal" size="26" class="text-muted" />
      </div>
      <div class="text-[15px] font-medium">{{ t('terminal.hostOffline') }}</div>
      <div class="text-[12.5px] text-muted max-w-md">{{ t('terminal.hostOfflineDesc') }}</div>
      <Button size="sm" variant="brand" @click="connectTab(active)">
        <Icon name="refresh" size="13" /> {{ t('terminal.reconnect') }}
      </Button>
    </div>

    <!-- 每个 Tab 一个终端容器(切换时 fit) -->
    <div
      v-for="t in tabs"
      :key="t.id"
      :ref="(el) => registerEl(t.id, el)"
      v-show="!t.offline && t.id === activeId"
      class="flex-1 min-h-[420px] bg-[#0a0d13] border border-line rounded-xl overflow-hidden p-2"
    />

    <p class="text-[11px] text-muted">
      {{ t('terminal.hostHint') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import Icon from '../components/Icon.vue'
import { Button } from '@/components/ui/button'
import {
  terminalOpen,
  terminalOutput,
  terminalInput,
  terminalResize,
  terminalClose,
} from '../api/terminal'
import { errorMessage } from '../util'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

interface TermTab {
  id: string
  title: string
  cwd: string
  sessionId: string // Agent 会话 ID(长轮询)
  offset: number // 输出游标
  connected: boolean
  offline: boolean
  error: string
  reconnecting: boolean
  retryDelay: number
  manualClose: boolean
  attempt: number
  retryTimer?: ReturnType<typeof setTimeout>
}

const tabs = ref<TermTab[]>([])
const activeId = ref('')
const emptyTab: TermTab = reactive({
  id: '', title: '', cwd: '', sessionId: '', offset: 0, connected: false, offline: false,
  error: '', reconnecting: false, retryDelay: 0, manualClose: true, attempt: 0,
})
// 当前活动 tab(computed;模板直接访问 active.xxx)
const active = computed<TermTab>(() => tabs.value.find((t) => t.id === activeId.value) || emptyTab)
// 非响应式实例(避免 Vue proxy 包裹 xterm)
const termMap = new Map<string, Terminal>()
const fitMap = new Map<string, FitAddon>()
const elMap = new Map<string, HTMLElement>()
// 长轮询控制:每 tab 一个 AbortController + 输入队列
const pollMap = new Map<string, AbortController>()
const inputBuf = new Map<string, string>()
let inputFlushTimer: ReturnType<typeof setTimeout> | undefined

const fullscreen = ref(false)
const hasSelection = ref(false)
const fontSize = ref(13)
const dark = ref(true)

let tabSeq = 0

function registerEl(id: string, el: unknown) {
  if (el) elMap.set(id, el as HTMLElement)
  else elMap.delete(id)
}

function switchTab(id: string) {
  if (id === activeId.value) return
  activeId.value = id
  // 激活后重新 fit
  const t = termMap.get(id)
  const f = fitMap.get(id)
  const el = elMap.get(id)
  if (t && f && el) {
    requestAnimationFrame(() => {
      try {
        f.fit()
      } catch {
        /* ignore */
      }
    })
  }
}

function newTab(cwd?: string) {
  const id = `t${++tabSeq}_${Date.now().toString(36)}`
  const dir = cwd || '/root'
  const tab: TermTab = reactive({
    id,
    title: titleOf(dir),
    cwd: dir,
    sessionId: '',
    offset: 0,
    connected: false,
    offline: false,
    error: '',
    reconnecting: false,
    retryDelay: 0,
    manualClose: false,
    attempt: 0,
  })
  tabs.value.push(tab)
  activeId.value = id
  // 等待 DOM 渲染后创建 xterm
  requestAnimationFrame(() => {
    if (tab.id !== activeId.value) return
    mountTerm(tab)
  })
}

function titleOf(dir: string): string {
  const seg = dir.split(/[\\/]+/).filter(Boolean)
  return seg.length ? seg[seg.length - 1] : '/'
}

function closeTab(id: string) {
  const idx = tabs.value.findIndex((t) => t.id === id)
  if (idx < 0) return
  const tab = tabs.value[idx]
  tab.manualClose = true
  if (tab.retryTimer) clearTimeout(tab.retryTimer)
  stopPoll(tab)
  if (tab.sessionId) void terminalClose(tab.sessionId).catch(() => undefined)
  termMap.get(id)?.dispose()
  termMap.delete(id)
  fitMap.delete(id)
  elMap.delete(id)
  inputBuf.delete(id)
  tabs.value.splice(idx, 1)
  if (tabs.value.length === 0) {
    // 至少保留一个
    newTab()
    return
  }
  if (activeId.value === id) {
    activeId.value = tabs.value[Math.min(idx, tabs.value.length - 1)].id
  }
}

// ---------- 终端连接(长轮询) ----------
function mountTerm(tab: TermTab) {
  let el = elMap.get(tab.id)
  // 兜底:函数 ref 在 v-for+自闭合元素上的注册偶发滞后,直接查 DOM
  if (!el) {
    el =
      [...document.querySelectorAll<HTMLElement>('div')].find(
        (d) => d.className.includes('min-h-[420px]') && d.className.includes('bg-[#0a0d13]'),
      ) || undefined
    if (el) elMap.set(tab.id, el)
  }
  if (!el) return
  const term = new Terminal({
    cursorBlink: true,
    fontSize: fontSize.value,
    fontFamily: 'Consolas, "Cascadia Code", monospace',
    theme: { background: '#0a0d13', foreground: '#d4d4d4', cursor: '#ec4899' },
    scrollback: 5000,
  })
  const fit = new FitAddon()
  term.loadAddon(fit)
  term.open(el)
  try {
    fit.fit()
  } catch {
    /* ignore */
  }
  termMap.set(tab.id, term)
  fitMap.set(tab.id, fit)
  term.onData((d) => {
    // 输入队列(合并小包,防抖 flush)
    if (tab.manualClose || !tab.sessionId) return
    const buf = (inputBuf.get(tab.id) || '') + d
    inputBuf.set(tab.id, buf)
    if (buf.length >= 2048) flushInput(tab)
    else if (!inputFlushTimer) {
      inputFlushTimer = setTimeout(() => {
        inputFlushTimer = undefined
        flushInput(tab)
      }, 30)
    }
  })
  term.onSelectionChange(() => {
    if (tab.id === activeId.value) hasSelection.value = !!term.getSelection()
  })
  connectTab(tab)
}

/** 编码 base64(无 padding) */
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

async function flushInput(tab: TermTab) {
  const buf = inputBuf.get(tab.id)
  if (!buf || !tab.sessionId || tab.manualClose) return
  inputBuf.set(tab.id, '')
  try {
    await terminalInput(tab.sessionId, encodeB64(buf))
  } catch {
    // 输入失败:写回终端提示(不中断 poll)
    const term = termMap.get(tab.id)
    term?.write(`\r\n\x1b[31m[${t('terminal.inputFailed')}]\x1b[0m\r\n`)
  }
}

function connectTab(tab: TermTab) {
  // 清理旧连接与定时器
  if (tab.retryTimer) clearTimeout(tab.retryTimer)
  stopPoll(tab)
  tab.error = ''
  tab.offline = false
  tab.reconnecting = false
  tab.retryDelay = 0
  tab.manualClose = false
  const term = termMap.get(tab.id)
  if (term) term.write('\r\n\x1b[33m[connecting…]\x1b[0m\r\n')
  terminalOpen(24, 80)
    .then((session) => {
      if (tab.manualClose) return
      tab.sessionId = session.sessionId
      tab.offset = session.offset || 0
      tab.connected = true
      tab.attempt = 0
      tab.reconnecting = false
      tab.retryDelay = 0
      startPoll(tab)
      sendResize(tab)
    })
    .catch((e) => {
      const term = termMap.get(tab.id)
      const msg = errorMessage(e)
      if (msg.includes('terminal_limit') || e?.code === 'terminal_limit') {
        term?.write(`\r\n\x1b[31m[${t('terminal.sessionLimit')}]\x1b[0m\r\n`)
      } else {
        term?.write(`\r\n\x1b[31m[${msg}]\x1b[0m\r\n`)
      }
      tab.error = msg
      tab.offline = true
      tab.connected = false
      tab.reconnecting = false
    })
}

/** 长轮询循环:output(offset 游标)→ 写终端 → 立即下一轮 */
function startPoll(tab: TermTab) {
  const controller = new AbortController()
  pollMap.set(tab.id, controller)
  const loop = async () => {
    if (tab.manualClose || controller.signal.aborted || !tab.sessionId) return
    try {
      const chunk = await terminalOutput(tab.sessionId, tab.offset, controller.signal)
      if (tab.manualClose || controller.signal.aborted) return
      if (chunk.truncated) {
        const term = termMap.get(tab.id)
        term?.write(`\r\n\x1b[33m[${t('terminal.outputTruncated')}]\x1b[0m\r\n`)
      }
      if (chunk.data) termMap.get(tab.id)?.write(decodeB64(chunk.data))
      tab.offset = chunk.nextOffset
      tab.connected = true
      tab.reconnecting = false
      tab.retryDelay = 0
      tab.attempt = 0
      if (chunk.exitError) termMap.get(tab.id)?.write(`\r\n\x1b[31m[${chunk.exitError}]\x1b[0m\r\n`)
      if (chunk.closed || chunk.exitedAt) {
        // 会话结束:保持连接态但停止轮询(用户可重连新会话)
        tab.connected = false
        tab.manualClose = true
        return
      }
      void loop() // 立即下一轮(wait=1000ms 长轮询)
    } catch (e: unknown) {
      if (controller.signal.aborted || tab.manualClose) return
      if ((e as { name?: string })?.name === 'AbortError') return
      // 重连退避(500ms → 5s 封顶)
      tab.connected = false
      tab.reconnecting = true
      tab.attempt++
      tab.retryDelay = Math.min(5000, 500 * 2 ** Math.min(tab.attempt - 1, 3))
      tab.retryTimer = setTimeout(() => {
        tab.retryTimer = undefined
        startPoll(tab)
      }, tab.retryDelay)
    }
  }
  void loop()
}

function stopPoll(tab: TermTab) {
  pollMap.get(tab.id)?.abort()
  pollMap.delete(tab.id)
}

function disconnectTab(tab: TermTab) {
  tab.manualClose = true
  if (tab.retryTimer) clearTimeout(tab.retryTimer)
  stopPoll(tab)
  inputBuf.delete(tab.id)
  if (tab.sessionId) {
    void terminalClose(tab.sessionId).catch(() => undefined)
    tab.sessionId = ''
  }
  tab.connected = false
  tab.reconnecting = false
}

function toggleActive() {
  const tab = tabs.value.find((t) => t.id === activeId.value)
  if (!tab) return
  if (tab.connected) disconnectTab(tab)
  else connectTab(tab)
}

function sendResize(tab: TermTab) {
  const fit = fitMap.get(tab.id)
  if (!fit || !tab.sessionId || tab.manualClose) return
  const { cols, rows } = fit.proposeDimensions() || { cols: 80, rows: 24 }
  void terminalResize(tab.sessionId, Math.max(2, Math.min(500, Math.round(rows))), Math.max(2, Math.min(1000, Math.round(cols)))).catch(() => undefined)
}

// ---------- 全屏 / 互跳 ----------
function toggleFullscreen() {
  fullscreen.value = !fullscreen.value
  requestAnimationFrame(() => {
    const tab = tabs.value.find((t) => t.id === activeId.value)
    if (tab) {
      try {
        fitMap.get(tab.id)?.fit()
      } catch {
        /* ignore */
      }
      sendResize(tab)
    }
  })
}

function openInFiles() {
  const tab = tabs.value.find((t) => t.id === activeId.value)
  if (!tab || !tab.cwd) return
  router.push({ path: '/files', query: { path: tab.cwd } })
}

// ---------- 工具 ----------
function copySel() {
  const tab = tabs.value.find((t) => t.id === activeId.value)
  const sel = tab ? termMap.get(tab.id)?.getSelection() : ''
  if (!sel) return
  navigator.clipboard?.writeText(sel).catch(() => {})
}

async function pasteText() {
  const tab = tabs.value.find((t) => t.id === activeId.value)
  if (!tab || !tab.sessionId || tab.manualClose) return
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      const buf = (inputBuf.get(tab.id) || '') + text
      inputBuf.set(tab.id, buf)
      flushInput(tab)
    }
  } catch {
    /* 剪贴板权限拒绝时静默 */
  }
}

function clearScreen() {
  const tab = tabs.value.find((t) => t.id === activeId.value)
  tab && termMap.get(tab.id)?.clear()
}

watch(fontSize, (n) => {
  if (n < 9) fontSize.value = 9
  if (n > 24) fontSize.value = 24
  termMap.forEach((t) => {
    t.options.fontSize = fontSize.value
  })
})

watch(dark, (d) => {
  const theme = d
    ? { background: '#0a0d13', foreground: '#d4d4d4', cursor: '#ec4899' }
    : { background: '#ffffff', foreground: '#1f2937', cursor: '#ec4899' }
  termMap.forEach((t) => {
    t.options.theme = theme
  })
})

function onResize() {
  if (fullscreen.value) return
  const tab = tabs.value.find((t) => t.id === activeId.value)
  if (tab?.connected) {
    try {
      fitMap.get(tab.id)?.fit()
    } catch {
      /* ignore */
    }
    sendResize(tab)
  }
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  // 来自文件管理器的「在终端打开」:?cwd= 指定初始目录
  const q = typeof route.query.cwd === 'string' && route.query.cwd ? route.query.cwd : '/root'
  newTab(q)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  if (inputFlushTimer) clearTimeout(inputFlushTimer)
  for (const tab of tabs.value) {
    if (tab.retryTimer) clearTimeout(tab.retryTimer)
    stopPoll(tab)
    if (tab.sessionId) void terminalClose(tab.sessionId).catch(() => undefined)
    termMap.get(tab.id)?.dispose()
  }
  tabs.value = []
  termMap.clear()
  fitMap.clear()
  pollMap.clear()
  inputBuf.clear()
})
</script>

<style scoped>
.term-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--muted-foreground, #94a3b8);
  white-space: nowrap;
}
.term-tab:hover {
  background: var(--surface2, rgba(255, 255, 255, 0.06));
}
.term-tab-active {
  background: rgba(236, 72, 153, 0.1);
  color: var(--brand, #ec4899);
  border: 1px solid rgba(236, 72, 153, 0.3);
}
.term-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: var(--background, #0a0d13);
  padding: 16px 20px;
}
.term-fullscreen :deep(.flex-1) {
  min-height: calc(100vh - 120px) !important;
}
</style>
