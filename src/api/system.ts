/**
 * 系统/监控 API。
 */
import { api } from './client'
import type {
  DefaultAccountResponse,
  HealthResponse,
  HostInfo,
  MonitorSnapshot,
  OkResponse,
  PanelEventsResponse,
  PanelLogsResponse,
  PublicConfig,
  PublicIPResponse,
  WallpaperResponse,
} from '../types'
import type { RegistryMirrorsResponse } from '../types'

/** 健康检查(公开) */
export const getHealth = () => api<HealthResponse>('/health')

/** 登录页"默认账号"提示(公开) */
export const getDefaultAccount = () => api<DefaultAccountResponse>('/system/default-account')

/** 前端启动配置:安全入口 basePath(公开,登录前调用) */
export const getPublicConfigApi = () => api<PublicConfig>('/system/public-config')

/** 宿主机信息 */
export const getHostInfo = () => api<HostInfo>('/system/host')

/** 监控快照(3s 节奏轮询) */
export const getMonitor = () => api<MonitorSnapshot>('/system/monitor')

/** 公网 IP */
export const getPublicIP = () => api<PublicIPResponse>('/system/public-ip')

/** 面板日志 */
export const getPanelLogs = (lines: string | number) => api<PanelLogsResponse>(`/system/logs?lines=${lines}`)

/** 面板事件列表 */
export const getPanelEvents = () => api<PanelEventsResponse>('/system/events')

/** 面板配置原文(字符串或 JSON) */
export const getSystemConfig = () => api<string | Record<string, unknown>>('/system/config')

/** 镜像加速地址(daemon.json) */
export const getRegistryMirrors = () => api<RegistryMirrorsResponse>('/system/registry-mirrors')

/** 保存镜像加速地址 */
export const saveRegistryMirrors = (mirrors: string[]) =>
  api<OkResponse>('/system/registry-mirrors', { method: 'PUT', json: { mirrors } })

/** 重启面板 */
export const restartPanel = () => api<OkResponse>('/system/restart', { method: 'POST' })

/** 重启 Docker 守护进程 */
export const restartDocker = () => api<OkResponse & { needRestart?: boolean }>('/system/restart-docker', { method: 'POST' })

/** 上传登录页壁纸(base64 data) */
export const saveWallpaper = (data: string) => api<OkResponse>('/system/wallpaper', { method: 'POST', json: { data } })

/** 获取登录页壁纸(公开;<img> 直接引用 /api/system/wallpaper) */
export const getWallpaper = () => api<WallpaperResponse>('/system/wallpaper')
