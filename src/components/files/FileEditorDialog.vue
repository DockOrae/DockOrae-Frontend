<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" :class="{ '!p-0': fullscreen }">
      <div class="absolute inset-0 bg-black/50" @click="onBackdrop" />
      <div
        class="relative flex flex-col w-full overflow-hidden border border-line rounded-xl bg-surface shadow-2xl"
        :class="fullscreen ? 'h-full !rounded-none' : 'max-w-4xl h-[76vh]'"
      >
        <!-- 工具栏 -->
        <div class="flex items-center gap-2 px-4 h-12 border-b border-line bg-surface2 shrink-0 flex-wrap">
          <Icon name="fileText" size="15" class="text-brand shrink-0" />
          <span class="text-[13px] font-medium truncate max-w-[260px]">{{ props.path }}</span>
          <span v-if="dirty" class="text-[11px] text-brand">●</span>
          <div class="ml-auto flex items-center gap-1.5">
            <Button variant="icon" :title="t('files.editorWrap')" :class="{ 'text-brand': wrap }" @click="wrap = !wrap">
              <Icon name="swap" size="13" />
            </Button>
            <Button variant="icon" :title="t(fullscreen ? 'files.editorExitFullscreen' : 'files.editorFullscreen')" @click="fullscreen = !fullscreen">
              <Icon :name="fullscreen ? 'minimize' : 'maximize'" size="13" />
            </Button>
            <Button variant="icon" :disabled="loading" :title="t('files.editorSave') + ' (Ctrl+S)'" @click="save">
              <Icon name="save" size="13" />
            </Button>
            <Button variant="icon" :title="'Close'" @click="onClose">
              <Icon name="x" size="14" />
            </Button>
          </div>
        </div>
        <!-- 错误 / 加载态 -->
        <div v-if="loadError" class="flex-1 flex flex-col items-center justify-center gap-3 text-muted">
          <Icon name="alert" size="28" />
          <span class="text-sm">{{ loadError }}</span>
        </div>
        <div v-else-if="loading" class="flex-1 flex items-center justify-center text-muted text-sm">
          {{ t('files.loading') }}
        </div>
        <!-- 编辑器(CodeMirror;大文件自动降级纯文本 textarea,§9/§24) -->
        <div v-show="!loading && !loadError && !plainMode" ref="editorEl" class="flex-1 overflow-hidden text-[13px]" />
        <textarea
          v-if="!loading && !loadError && plainMode"
          v-model="plainText"
          class="flex-1 w-full resize-none bg-transparent p-3 font-mono text-[13px] outline-none"
          spellcheck="false"
          @keydown.ctrl.s.prevent="save"
          @keydown.meta.s.prevent="save"
        />
        <!-- 状态栏 -->
        <div v-if="!loading && !loadError" class="flex items-center gap-4 px-4 h-7 border-t border-line bg-surface2 text-[11px] text-muted shrink-0">
          <span v-if="plainMode" class="text-amber-500">{{ t('files.editorPlainMode') }}</span>
          <span v-else>{{ t('files.editorFindHint') }}</span>
          <span class="ml-auto flex items-center gap-3">
            <span>{{ t('files.colName') }}: {{ fileName }}</span>
            <span v-if="sizeText">{{ t('files.propSize') }}: {{ sizeText }}</span>
            <span>{{ t('files.editorSave') }}: Ctrl+S</span>
          </span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { EditorState, type Extension } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { StreamLanguage, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import { json } from '@codemirror/lang-json'
import { yaml } from '@codemirror/lang-yaml'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { javascript } from '@codemirror/lang-javascript'
import { markdown } from '@codemirror/lang-markdown'
import { go } from '@codemirror/lang-go'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { toml } from '@codemirror/legacy-modes/mode/toml'
import { properties } from '@codemirror/legacy-modes/mode/properties'
import { nginx } from '@codemirror/legacy-modes/mode/nginx'
import { dockerFile } from '@codemirror/legacy-modes/mode/dockerfile'
import Icon from '../Icon.vue'
import { Button } from '@/components/ui/button'
import { fileDownloadUrl, statFile, writeFile } from '../../api/files'
import { formatBytes } from '../../util'
import { toastErr, toastOk } from '../../toast'
import { useConfirm } from '../../confirm'

const props = defineProps<{ open: boolean; path: string }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const { t } = useI18n()
const confirm = useConfirm()

const fileName = computed(() => props.path.split(/[\\/]/).filter(Boolean).pop() || props.path)

const editorEl = ref<HTMLElement | null>(null)
const loading = ref(false)
const loadError = ref('')
const content = ref('')
const plainText = ref('')
const plainMode = ref(false)
const dirty = ref(false)
const wrap = ref(false)
const fullscreen = ref(false)
const sizeText = ref('')
// 版本快照(保存冲突检测:resourceVersion)
const version = reactive({ resourceVersion: '' })
let view: EditorView | null = null

// CodeMirror 编辑上限;超过自动降级纯文本(§9);超过绝对上限拒绝
const CM_EDIT_LIMIT = 2 * 1024 * 1024
const PLAIN_EDIT_LIMIT = 20 * 1024 * 1024

// 纯文本模式输入追踪
watch(plainText, (v) => {
  if (v !== content.value) dirty.value = true
})

function langFor(name: string): Extension | null {
  const e = name.split('.').pop()?.toLowerCase() ?? ''
  switch (e) {
    case 'json':
    case 'jsonc':
      return json()
    case 'yaml':
    case 'yml':
      return yaml()
    case 'md':
    case 'markdown':
      return markdown()
    case 'ts':
    case 'tsx':
    case 'mts':
    case 'cts':
      return javascript({ typescript: true })
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return javascript()
    case 'vue':
    case 'html':
    case 'htm':
    case 'xml':
    case 'svg':
      return html()
    case 'css':
    case 'scss':
    case 'less':
      return css()
    case 'go':
      return go()
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'env':
      return StreamLanguage.define(shell)
    case 'toml':
      return StreamLanguage.define(toml)
    case 'ini':
    case 'service':
    case 'properties':
      return StreamLanguage.define(properties)
    case 'conf':
      return StreamLanguage.define(nginx)
    case 'dockerfile':
      return StreamLanguage.define(dockerFile)
    default:
      return null
  }
}

async function load() {
  loading.value = true
  loadError.value = ''
  dirty.value = false
  content.value = ''
  plainText.value = ''
  plainMode.value = false
  sizeText.value = ''
  version.resourceVersion = ''
  try {
    const resp = await fetch(fileDownloadUrl(props.path, 'inline'), { cache: 'no-store' })
    if (!resp.ok) throw new Error(String(resp.status))
    const buf = await resp.arrayBuffer()
    sizeText.value = formatBytes(buf.byteLength)
    if (buf.byteLength > PLAIN_EDIT_LIMIT) {
      loadError.value = t('files.editorTooLarge')
      return
    }
    const bytes = new Uint8Array(buf)
    if (bytes.slice(0, 8192).includes(0)) {
      loadError.value = t('files.editorBinary')
      return
    }
    content.value = new TextDecoder().decode(bytes)
    // §9:大文件自动降级纯文本(无语法高亮/行号,仍可编辑保存)
    plainMode.value = buf.byteLength > CM_EDIT_LIMIT
    if (plainMode.value) plainText.value = content.value
    // 记录资源版本,保存前比对(resourceVersion 冲突检测)
    try {
      const st = await statFile(props.path)
      version.resourceVersion = st.resourceVersion || ''
    } catch {
      /* stat 失败(瞬时)不阻塞编辑;版本为空则跳过冲突检测 */
    }
  } catch {
    loadError.value = t('files.editorLoadFailed')
  } finally {
    loading.value = false
    await nextTick()
    if (!plainMode.value) mountEditor()
  }
}

// 亮色主题(与面板 light 配色一致)
const lightTheme = EditorView.theme({
  '&': { backgroundColor: '#ffffff', color: '#1f2937', height: '100%' },
  '.cm-content': { caretColor: '#ec4899', fontFamily: 'Consolas, "Cascadia Code", monospace', fontSize: '13px' },
  '.cm-gutters': { backgroundColor: '#f6f7f9', color: '#9ca3af', borderRight: '1px solid #e5e7eb' },
  '.cm-activeLine': { backgroundColor: 'rgba(0,0,0,0.03)' },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(0,0,0,0.03)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: 'rgba(236,72,153,0.18)' },
})
const darkTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '13px' },
  '.cm-content': { fontFamily: 'Consolas, "Cascadia Code", monospace' },
})

function mountEditor() {
  view?.destroy()
  view = null
  if (!editorEl.value) return
  const isDark = document.documentElement.dataset.theme !== 'light'
  const exts: Extension[] = [
    lineNumbers(),
    highlightActiveLine(),
    history(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    highlightSelectionMatches(),
    keymap.of([...defaultKeymap, ...searchKeymap, ...historyKeymap, indentWithTab, { key: 'Mod-s', run: () => { save(); return true } }]),
    EditorView.updateListener.of((u) => {
      if (u.docChanged) dirty.value = true
    }),
  ]
  if (wrap.value) exts.push(EditorView.lineWrapping)
  const lang = langFor(fileName.value)
  if (lang) exts.push(lang)
  exts.push(isDark ? [oneDark, darkTheme] : lightTheme)
  view = new EditorView({
    parent: editorEl.value,
    state: EditorState.create({ doc: content.value, extensions: exts }),
  })
}

async function save() {
  if (loading.value) return
  // 冲突检测:读取资源版本,变化则提示,禁止静默覆盖其他进程的修改
  if (version.resourceVersion) {
    try {
      const st = await statFile(props.path)
      if ((st.resourceVersion || '') !== version.resourceVersion) {
        const ok = await confirm(t('files.editorConflict'), { title: t('files.editorConflictTitle'), danger: true })
        if (!ok) return
      }
    } catch {
      /* stat 失败不阻塞保存 */
    }
  }
  const newContent = plainMode.value ? plainText.value : view?.state.doc.toString() ?? ''
  try {
    await writeFile(props.path, newContent, version.resourceVersion || '')
    dirty.value = false
    // 保存成功后刷新版本快照
    try {
      const st = await statFile(props.path)
      version.resourceVersion = st.resourceVersion || ''
    } catch {
      /* ignore */
    }
    toastOk(t('files.editorSaved'))
    emit('saved')
  } catch (e) {
    toastErr(e instanceof Error ? e.message : t('files.errActionFailed'))
  }
}

async function onClose() {
  if (dirty.value) {
    const ok = await confirm(t('files.editorUnsaved'), { title: t('common.confirm'), danger: false })
    if (!ok) return
  }
  emit('close')
}

function onBackdrop() {
  onClose()
}

watch(
  () => props.open,
  (v) => {
    if (v) {
      fullscreen.value = false
      load()
    } else {
      view?.destroy()
      view = null
    }
  },
  { immediate: true },
)

watch([wrap, () => document.documentElement.dataset.theme], () => {
  if (props.open && !loading.value && !loadError.value && !plainMode.value) mountEditor()
})

onBeforeUnmount(() => {
  view?.destroy()
  view = null
})
</script>
