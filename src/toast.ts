import { reactive } from 'vue'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  message: string
  type: ToastType
}

export const toastState = reactive<{ items: ToastItem[] }>({
  items: [],
})

let id = 0

export function toast(message: string, type: ToastType = 'success', duration = 3200): void {
  const item: ToastItem = { id: ++id, message, type }
  toastState.items.push(item)
  setTimeout(() => {
    const i = toastState.items.findIndex((x) => x.id === item.id)
    if (i >= 0) toastState.items.splice(i, 1)
  }, duration)
}

export const toastOk = (m: string): void => toast(m, 'success')
export const toastErr = (m: string): void => toast(m, 'error', 5000)
export const toastInfo = (m: string): void => toast(m, 'info')
