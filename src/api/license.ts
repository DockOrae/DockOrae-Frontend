/**
 * License API(V3 Event-Driven)。
 */
import { api } from './client'
import type { LicenseDemoResponse, LicenseInfo, LicenseVerifyResponse, OkResponse } from '../types'

/** 查询授权状态(含在线验证状态) */
export const getLicense = () => api<LicenseInfo>('/license')

/** Key 激活 */
export const activateLicense = (key: string) => api<OkResponse>('/license/activate', { method: 'POST', json: { key } })

/** 上传许可文件激活(FormData multipart) */
export const activateLicenseFile = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api<OkResponse>('/license/activate-file', { method: 'POST', body: fd })
}

/** 解绑(保留 Key,不吊销) */
export const deactivateLicense = () => api<OkResponse>('/license/deactivate', { method: 'POST' })

/** 手动触发一次在线验证(配置了授权服务器时生效;吊销即时触达) */
export const verifyLicense = () => api<LicenseVerifyResponse>('/license/verify', { method: 'POST' })

/** 获取演示 Key */
export const getDemoKey = () => api<LicenseDemoResponse>('/license/demo')
