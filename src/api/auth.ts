/**
 * 认证与账户 API。
 */
import { api } from './client'
import type {
  AvatarResponse,
  LoginResponse,
  LoginTotpResponse,
  MeResponse,
  OkResponse,
  ProfileResponse,
  TotpSetupResponse,
} from '../types'
import type { ChangePasswordReq, UpdateProfileReq } from '../types'

/** 密码登录(2FA 已启用时返回 totp_required) */
export const login = (username: string, password: string) =>
  api<LoginResponse>('/login', { method: 'POST', json: { username, password } })

/** 2FA 第二步 */
export const loginTotp = (username: string, code: string) =>
  api<LoginTotpResponse>('/login/totp', { method: 'POST', json: { username, code } })

/** 当前用户信息 */
export const getMe = () => api<MeResponse>('/me')

/** 更新资料(昵称/用户名;用户名变更时返回新 token) */
export const updateProfile = (req: UpdateProfileReq) => api<ProfileResponse>('/profile', { method: 'POST', json: req })

/** 上传头像(base64 data URL 的 data 部分) */
export const uploadAvatar = (data: string) => api<AvatarResponse>('/avatar', { method: 'POST', json: { data } })

/** 修改密码 */
export const changePassword = (req: ChangePasswordReq) =>
  api<OkResponse>('/password', { method: 'POST', json: req })

/** TOTP 第一步:获取 secret + otpauth URI */
export const totpSetup = (password: string) => api<TotpSetupResponse>('/totp/setup', { method: 'POST', json: { password } })

/** TOTP 启用 */
export const totpEnable = (code: string) => api<OkResponse>('/totp/enable', { method: 'POST', json: { code } })

/** TOTP 禁用(需密码 + 动态码) */
export const totpDisable = (password: string, code: string) =>
  api<OkResponse>('/totp/disable', { method: 'POST', json: { password, code } })
