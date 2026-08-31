/**
 * API 通用类型:DockOrae 后端统一 JSON 契约。
 * 结构以 https://github.com/DockOrae/DockOrae 后端实际实现为准。
 */

/** 后端错误响应体:error 字段为 i18n key 或英文消息 */
export interface ApiErrorBody {
  error?: string
  message?: string
}

/** 前端统一的 API 错误(分类 + 已翻译消息) */
export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'auth' | 'docker' | 'validation'

export interface ApiErrorLike {
  kind: ApiErrorKind
  message: string
  status?: number
}

/** api() 请求选项(在 fetch 之上扩展 json 快捷字段) */
export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  /** 自动 JSON 序列化并设置 Content-Type */
  json?: unknown
  /** 透传 fetch body(FormData / 字符串等);与 json 二选一 */
  body?: BodyInit | null
}

/** 通用操作成功响应 */
export interface OkResponse {
  ok: boolean
  needRestart?: boolean
  message?: string
}

/** 通用创建成功响应(返回新资源 id) */
export interface CreateResponse {
  id?: string
}

/** 健康检查 */
export interface HealthResponse {
  ok: boolean
  name: string
  version: string
}

/** 登录第一步(密码):成功或 2FA 提示 */
export interface LoginResponse {
  token?: string
  username?: string
  nickname?: string
  avatar?: string
  must_change_password?: boolean
  totp_enabled?: boolean
  /** 已启用 2FA 时返回 totp_required */
  totp_required?: boolean
}

/** 2FA 登录第二步 */
export interface LoginTotpResponse {
  token: string
  username: string
  nickname?: string
  avatar?: string
  must_change_password?: boolean
  totp_enabled: boolean
}

/** 当前用户信息(/me) */
export interface MeResponse {
  username: string
  nickname: string
  avatar: string
  must_change_password: boolean
  totp_enabled: boolean
}

/** 更新资料响应(用户名变更时返回新 token) */
export interface ProfileResponse extends MeResponse {
  token?: string
}

/** 前端启动配置(/system/public-config) */
export interface PublicConfig {
  basePath?: string
}

/** 登录页"默认账号"提示条件 */
export interface DefaultAccountResponse {
  show: boolean
}

/** 登录页壁纸(公开接口,无 token) */
export interface WallpaperResponse {
  data?: string
}

/** 上传头像响应 */
export interface AvatarResponse {
  ok: boolean
  avatar: string
}

/** TOTP 设置(第一步)响应 */
export interface TotpSetupResponse {
  secret: string
  uri: string
}

/** 面板公网 IP */
export interface PublicIPResponse {
  ipv4: string
  ipv6: string
}

/** NDJSON 流式行解析(拉取镜像 / Compose 部署) */
export interface NDJSONLine {
  type?: string
  data?: string
  ok?: boolean
  error?: string
}
