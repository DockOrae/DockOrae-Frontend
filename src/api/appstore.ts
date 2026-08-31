/**
 * 应用商店 API(仓库驱动)。
 */
import { api } from './client'
import type { AppDetail, AppInstallReq, AppListResponse, AppOperationResponse, AppPreviewResponse } from '../types'

/** 应用列表 + 分类 */
export const listApps = () => api<AppListResponse>('/apps')

/** 同步应用商店数据(从 GitHub 仓库拉取) */
export const syncApps = () => api<AppOperationResponse>('/apps/sync', { method: 'POST' })

/** 应用详情(参数 schema) */
export const getAppDetail = (key: string) => api<AppDetail>(`/apps/${key}`)

/** 渲染 compose 预览 */
export const previewApp = (key: string, params: Record<string, string>) =>
  api<AppPreviewResponse>(`/apps/${key}/preview`, { method: 'POST', json: { params } })

/** 一键安装 */
export const installApp = (key: string, req: AppInstallReq) =>
  api<AppOperationResponse>(`/apps/${key}/install`, { method: 'POST', json: req })

/** 卸载 */
export const uninstallApp = (key: string) => api<AppOperationResponse>(`/apps/${key}/uninstall`, { method: 'POST' })

/** 升级 */
export const upgradeApp = (key: string) => api<AppOperationResponse>(`/apps/${key}/upgrade`, { method: 'POST' })
