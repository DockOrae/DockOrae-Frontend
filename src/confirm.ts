import { reactive } from 'vue'
import { t } from './i18n'

export type ConfirmSize = 'sm' | 'lg' | 'xl'

export interface ConfirmOptions {
  title?: string
  danger?: boolean
  confirmText?: string
  size?: ConfirmSize
}

export interface ConfirmState {
  visible: boolean
  title: string
  message: string
  danger: boolean
  confirmText: string
  size: ConfirmSize
  _resolve: ((val: boolean) => void) | null
  /** 确认按钮已抢先 resolve 的标志(防止 reka 关闭事件抢先 resolve(false)) */
  _resolved: boolean
}

export const confirmState: ConfirmState = reactive({
  visible: false,
  title: '',
  message: '',
  danger: true,
  confirmText: '',
  size: 'sm',
  _resolve: null,
  _resolved: false,
})

type ConfirmFn = (message: string, opts?: ConfirmOptions) => Promise<boolean>

export function useConfirm(): ConfirmFn {
  return (message: string, opts: ConfirmOptions = {}) =>
    new Promise<boolean>((resolve) => {
      confirmState.title = opts.title || t('common.confirm')
      confirmState.message = message
      confirmState.danger = opts.danger !== false
      confirmState.confirmText = opts.confirmText || t('common.ok')
      confirmState.size = opts.size || 'sm'
      confirmState._resolved = false // 每次打开重置(上次点确认后残留 true 会导致本次取消不生效)
      confirmState._resolve = resolve
      confirmState.visible = true
    })
}

export function resolveConfirm(val: boolean): void {
  confirmState.visible = false
  if (confirmState._resolve) confirmState._resolve(val)
  confirmState._resolve = null
}
