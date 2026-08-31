/**
 * 面板设置 API。
 */
import { api } from './client'
import type { OkResponse, PanelSettings, PanelSettingsPatch } from '../types'

/** 读取面板设置 */
export const getPanelSettings = () => api<PanelSettings>('/system/settings')

/** 保存面板设置 */
export const savePanelSettings = (patch: PanelSettingsPatch) =>
  api<OkResponse>('/system/settings', { method: 'PUT', json: patch })

/** 测试邮件(后端实际发送) */
export const testEmail = () => api<OkResponse>('/system/test-email', { method: 'POST' })
