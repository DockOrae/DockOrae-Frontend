/**
 * 系统/监控 API。
 */
import { api } from './client'
import type { OkResponse } from '../types'
import type { RegistryMirrorsResponse } from '../types'

/** 镜像加速地址(daemon.json) */
export const getRegistryMirrors = () => api<RegistryMirrorsResponse>('/system/registry-mirrors')

/** 保存镜像加速地址 */
export const saveRegistryMirrors = (mirrors: string[]) =>
  api<OkResponse>('/system/registry-mirrors', { method: 'PUT', json: { mirrors } })
