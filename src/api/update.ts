/**
 * 在线更新 API。
 */
import { api } from './client'
import type { UpdateApplyResponse, UpdateInfo, UpdateStatus } from '../types'

/** 检查更新(后端 10 分钟缓存) */
export const checkUpdate = () => api<UpdateInfo>('/update/check')

/** 更新进度(1s 轮询) */
export const getUpdateStatus = () => api<UpdateStatus>('/update/status')

/** 启动更新(异步执行) */
export const applyUpdate = () => api<UpdateApplyResponse>('/update/apply', { method: 'POST' })
