import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN'
import zhTW from './locales/zh-TW'
import en from './locales/en'

const LANG_KEY = 'dm_lang'

/** 支持语言:简体中文 / 繁體中文 / English(顺序即语言菜单展示顺序) */
export const LANGS = [
  { code: 'zh-CN', label: '简体中文', flag: '🇨🇳', rtl: false },
  { code: 'zh-TW', label: '繁體中文', flag: '🇹🇼', rtl: false },
  { code: 'en', label: 'English', flag: '🇺🇸', rtl: false },
]

const SUPPORTED = LANGS.map((l) => l.code)
const DEFAULT_LANG = 'zh-CN'

function applyDir(code) {
  const lang = LANGS.find((l) => l.code === code)
  if (lang && lang.rtl) {
    document.documentElement.dir = 'rtl'
  } else {
    document.documentElement.dir = 'ltr'
  }
}

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY)
  if (saved && SUPPORTED.includes(saved)) return saved
  const nav = (navigator.language || 'zh-CN').toLowerCase()
  if (nav.startsWith('zh-tw') || nav.startsWith('zh-hk')) return 'zh-TW'
  if (nav.startsWith('zh')) return 'zh-CN'
  return 'en'
}

const i18n = createI18n({
  legacy: false,
  locale: loadLang(),
  fallbackLocale: 'en',
  messages: {
    'zh-CN': zhCN,
    'zh-TW': zhTW,
    en,
  },
})

applyDir(i18n.global.locale.value)

export function setLocale(code) {
  if (!SUPPORTED.includes(code)) return
  i18n.global.locale.value = code
  localStorage.setItem(LANG_KEY, code)
  applyDir(code)
  document.documentElement.lang = code
}

/** 全局翻译辅助(api.js / confirm.js 用) */
export function t(key, params) {
  return i18n.global.t(key, params)
}

/** 切换语言(ToggleLocale 用;setLang 为旧别名,保持兼容) */
export const setLang = setLocale

export default i18n
