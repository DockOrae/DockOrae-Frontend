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
        <!-- 编辑器 -->
        <div v-show="!loading && !loadError" ref="editorEl" class="flex-1 overflow-hidden text-[13px]" />
        <!-- 状态栏 -->
        <div v-if="!loading && !loadError" class="flex items-center gap-4 px-4 h-7 border-t border-line bg-surface2 text-[11px] text-muted shrink-0">
          <span>{{ t('files.editorFindHint') }}</span>
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
import { computed, ref, watch, nextTick } from 'vue'
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
import { fileDownloadUrl, writeFile } from '../../api/files'
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
const dirty = ref(false)
const wrap = ref(false)
const fullscreen = ref(false)
const sizeText = ref('')
let view: EditorView | null = null

const MAX_EDIT = 2 * 1024 * 1024

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
  sizeText.value = ''
  try {
    const resp = await fetch(fileDownloadUrl(props.path), { cache: 'no-store' })
    if (!resp.ok) throw new Error(String(resp.status))
    const buf = await resp.arrayBuffer()
    sizeText.value = formatBytes(buf.byteLength)
    if (buf.byteLength > MAX_EDIT) {
      loadError.value = t('files.editorTooLarge')
      return
    }
    const bytes = new Uint8Array(buf)
    if (bytes.slice(0, 8192).includes(0)) {
      loadError.value = t('files.editorBinary')
      return
    }
    content.value = new TextDecoder().decode(bytes)
  } catch {
    loadError.value = t('files.editorLoadFailed')
  } finally {
    loading.value = false
    await nextTick()
    mountEditor()
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
  if (!view || loading.value) return
  try {
    await writeFile(props.path, view.state.doc.toString())
    dirty.value = false
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
)

watch([wrap, () => document.documentElement.dataset.theme], () => {
  if (props.open && !loading.value && !loadError.value) mountEditor()
})
</script>
