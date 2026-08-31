/**
 * 面板设置类型(后端 internal/settings/settings.go Settings 结构,camelCase JSON)。
 */

/** 面板设置(settings.json / SQLite) */
export interface PanelSettings {
  webListen: string
  webDomain: string
  webPort: number
  webBasePath: string
  noAuthSetting: string
  sessionMaxAge: number
  ipLimitAllowlist?: string[]
  webCertFile: string
  webKeyFile: string
  webForceSSL: boolean
  timeZone: string
  datePickerType: string
  ntpServer: string
  tgEnable: boolean
  tgBotToken: string
  tgAdminChatId: string
  tgNotifyEvents: string[]
  tgRunTime: string
  tgBotBackup: boolean
  tgLang: string
  tgBotAPIServer: string
  emailEnable: boolean
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string
  smtpFrom: string
  smtpFromName: string
  smtpTo: string
  smtpEncryption: string
  emailNotifyEvents: string[]
}

/** 保存面板设置的请求体(同 PanelSettings,可选字段) */
export type PanelSettingsPatch = Partial<PanelSettings>

/** 镜像加速(/system/registry-mirrors) */
export interface RegistryMirrorsResponse {
  mirrors: string[]
  path: string
  exists: boolean
}

/** 修改密码请求 */
export interface ChangePasswordReq {
  old_password: string
  new_password: string
}

/** 修改资料请求(nickname / username 可选) */
export interface UpdateProfileReq {
  nickname?: string | null
  username?: string | null
}
