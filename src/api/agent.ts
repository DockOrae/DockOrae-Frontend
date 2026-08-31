/**
 * Agent(宿主机控制平面)API。
 * 面板是唯一调用方(§53:Frontend → DockOrae → Agent)。
 */
import { api } from './client'
import type { AgentHealth, SwapStatus, AgentHostInfo, OkResponse } from '../types'

/** Agent 连通性 */
export const getAgentHealth = () => api<AgentHealth>('/agent/status')

/** Swap 状态 */
export const getSwapStatus = () => api<SwapStatus>('/agent/swap')

/** Swap 操作:create / resize / delete(危险操作带 confirm) */
export const swapAction = (payload: { action: 'create' | 'resize' | 'delete'; size_mb?: number; path?: string; confirm: boolean }) =>
  api<SwapStatus & { ok?: boolean }>('/agent/swap', { method: 'POST', json: payload })

/** 宿主机信息(经 Agent,数据来自真实宿主) */
export const getAgentHostInfo = () => api<AgentHostInfo>('/agent/host/info')

/** 设置主机名 */
export const setHostname = (hostname: string) => api<OkResponse>('/agent/host/hostname', { method: 'POST', json: { hostname } })

/** 重启宿主机(危险操作) */
export const rebootHost = (confirm: boolean) => api<OkResponse>('/agent/host/reboot', { method: 'POST', json: { confirm } })
