/**
 * Agent(宿主机控制平面)API。
 * 面板是唯一调用方(§53:Frontend → DockOrae → Agent)。
 */
import { api } from './client'
import type { SwapStatus } from '../types'

/** Swap 状态 */
export const getSwapStatus = () => api<SwapStatus>('/agent/swap')

/** Swap 操作:create / resize / delete(危险操作带 confirm) */
export const swapAction = (payload: { action: 'create' | 'resize' | 'delete'; size_mb?: number; path?: string; confirm: boolean }) =>
  api<SwapStatus & { ok?: boolean }>('/agent/swap', { method: 'POST', json: payload })
