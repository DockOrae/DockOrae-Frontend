/**
 * License 类型(V3 Event-Driven;后端 internal/service/license.go LicenseInfo / onlineInfo)。
 */

/** 授权 Key 解码信息(后端 LicenseVerifyKey 返回) */
export interface LicenseKeyInfo {
  status?: string
  plan?: string
  type?: string
  features?: string[]
  [key: string]: unknown
}

/** 在线验证状态(onlineInfo) */
export interface LicenseOnline {
  /** 模式:offline(未配置授权服务器)/ online */
  mode?: string
  /** 在线验证状态:verified / grace / grace_expired / revoked / version_blocked / clock_rollback / update_required / never ... */
  state?: string
  server_url?: string
  /** V3 同步状态:online / offline / grace / grace_expired / server_recovered / revoked / blocked / unbound ... */
  sync_state?: string
  /** 最近成功验证时间(Unix 秒) */
  last_verify?: number
  /** 宽限期截止(Unix 秒) */
  grace_deadline?: number
  /** verify_state:verified / revoked / invalid / blocked / clock_rollback / unbound ... */
  verify_state?: string
  revoked_at?: number
  /** V3 事件游标 */
  last_event_id?: string
  /** V3 权威版本 */
  state_version?: number
  /** 解绑来源:admin_unbound / user_unbound */
  unbind_reason?: string
  /** 解绑来源(SSE 事件):admin / user */
  unbind_source?: string
}

/** /license 响应 */
export interface LicenseInfo {
  active: boolean
  key: string
  info: LicenseKeyInfo | null
  device_id: string
  bound: boolean
  bound_to?: string
  activation_id?: string
  online: LicenseOnline
}

/** 手动验证响应(/license/verify) */
export interface LicenseVerifyResponse {
  state?: string
  error?: string
}

/** 演示 Key 响应(/license/demo) */
export interface LicenseDemoResponse {
  key?: string
}
