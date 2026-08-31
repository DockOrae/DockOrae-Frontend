/**
 * 统一 API Client:DockOrae 后端请求层。
 * - api<T>() 泛型返回,业务代码不再出现裸 any
 * - 错误统一分类(ApiError.kind):auth / http / network / docker / validation
 * - 登录 401 自动跳转登录页(带具体错误消息优先展示)
 * - 安全入口(webBasePath)前缀统一处理
 */
import { t } from '../i18n'
import type { ApiErrorKind, ApiErrorLike, ApiRequestOptions, PublicConfig } from '../types'
import type { PullProgressLine } from '../types'

/** 后端返回 i18n key 或英文消息;翻译 key,其余原样保留 */
function errMsg(m: string): string {
  try {
    const s = t(m)
    return s && s !== m ? s : m
  } catch {
    return m
  }
}

/** 前端统一 API 错误(消息已翻译,kind 分类) */
export class ApiError extends Error implements ApiErrorLike {
  kind: ApiErrorKind
  status?: number

  constructor(message: string, kind: ApiErrorKind = 'http', status?: number) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
  }
}

const TOKEN_KEY = 'dm_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

/** 登录前可访问:安全入口(webBasePath)等前端启动配置(不带 token) */
let cachedBase = ''
export async function getPublicConfig(): Promise<PublicConfig> {
  try {
    const res = await fetch('/api/system/public-config', { cache: 'no-store' })
    if (!res.ok) return {}
    const j = (await res.json()) as PublicConfig
    cachedBase = j.basePath && j.basePath !== '/' ? j.basePath.replace(/\/$/, '') : ''
    return j
  } catch {
    return {}
  }
}

/** 安全入口前缀(API/WS/页面跳转统一使用;留空 = 无前缀) */
export function entrancePath(p: string): string {
  return cachedBase ? cachedBase + p : p
}

/** 从错误响应体提取 error 字段(可能为 i18n key) */
async function extractError(res: Response, fallback: string): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string }
    return j.error || fallback
  } catch {
    return res.statusText || fallback
  }
}

/** 统一请求入口:GET 直接调;POST/PUT/DELETE 传 opts */
export async function api<T = unknown>(path: string, opts: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(opts.headers)
  if (opts.json !== undefined) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let res: Response
  try {
    res = await fetch(entrancePath('/api' + path), {
      ...opts,
      headers,
      body: opts.json !== undefined ? JSON.stringify(opts.json) : opts.body,
    })
  } catch {
    throw new ApiError(errMsg('err.networkError'), 'network')
  }

  if (res.status === 401) {
    // 登录/2FA 接口的 401 带具体错误消息(如 login.errPwd),优先展示
    const msg = await extractError(res, '')
    if (msg) throw new ApiError(errMsg(msg), 'auth', 401)
    setToken(null)
    if (!location.pathname.endsWith('/login')) location.href = entrancePath('/login')
    throw new ApiError(errMsg('err.notLogin'), 'auth', 401)
  }

  if (!res.ok) {
    const msg = await extractError(res, errMsg('err.requestFailed'))
    throw new ApiError(errMsg(msg), res.status >= 400 && res.status < 500 ? 'validation' : 'http', res.status)
  }

  return (await res.json()) as T
}

/** WebSocket 地址(带 token query 认证) */
export function wsUrl(path: string): string {
  const p = entrancePath('/api' + path)
  const sep = p.includes('?') ? '&' : '?'
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${p}${sep}token=${encodeURIComponent(getToken() || '')}`
}

/** Pull image progress stream (NDJSON) */
export async function pullImageStream(
  payload: { from_image: string; tag?: string | null },
  onLine: (line: PullProgressLine) => void,
): Promise<void> {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let res: Response
  try {
    res = await fetch(entrancePath('/api/images/pull'), { method: 'POST', headers, body: JSON.stringify(payload) })
  } catch {
    throw new ApiError(errMsg('err.networkError'), 'network')
  }
  if (!res.ok) {
    const msg = await extractError(res, errMsg('err.pullFailed'))
    throw new ApiError(errMsg(msg), 'http', res.status)
  }
  if (!res.body) throw new ApiError(errMsg('err.pullFailed'), 'http')

  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let idx
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx)
      buf = buf.slice(idx + 1)
      if (!line.trim()) continue
      try {
        onLine(JSON.parse(line) as PullProgressLine)
      } catch {
        /* ignore non-JSON lines */
      }
    }
  }
}

/**
 * Compose deploy/update progress stream (NDJSON)。
 * Line callback `{type:'line',data}`;结束时收到 `{type:'done',ok,error}` → resolve/reject。
 */
export async function composeStream(
  path: string,
  payload: { project: string; yaml: string },
  onLine: (data: string) => void,
): Promise<void> {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let res: Response
  try {
    res = await fetch(entrancePath('/api' + path), { method: 'POST', headers, body: JSON.stringify(payload) })
  } catch {
    throw new ApiError(errMsg('err.networkError'), 'network')
  }
  if (!res.ok) {
    const msg = await extractError(res, errMsg('err.requestFailed'))
    throw new ApiError(errMsg(msg), 'http', res.status)
  }
  if (!res.body) throw new ApiError(errMsg('err.execFailed'), 'http')

  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let idx
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx)
      buf = buf.slice(idx + 1)
      if (!line.trim()) continue
      let msg: { type?: string; data?: string; ok?: boolean; error?: string }
      try {
        msg = JSON.parse(line)
      } catch {
        continue
      }
      if (msg.type === 'line' && msg.data != null) {
        onLine(msg.data)
      } else if (msg.type === 'done') {
        if (msg.ok) return
        throw new ApiError(errMsg(msg.error || 'err.execFailed'), 'http')
      }
    }
  }
}
