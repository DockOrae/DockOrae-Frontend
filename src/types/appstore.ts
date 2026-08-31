/**
 * 应用商店类型(仓库驱动:DockOrae-Apps data.yml;后端 internal/appstore)。
 */

/** 应用列表项(卡片展示字段) */
export interface AppItem {
  key: string
  name: string
  description: string
  /** emoji 兜底图标 */
  icon: string
  /** 分类(原始值 = data.yml 顶层 tags,中文为主) */
  category: string
  installed: boolean
  update_available: boolean
}

/** 应用详情(在列表项基础上扩展) */
export interface AppDetail extends AppItem {
  params: AppParam[]
}

/** 安装参数定义(DockOrae-Apps formFields) */
export interface AppParam {
  key: string
  type: 'text' | 'number' | 'password' | 'select' | 'checkbox' | 'textarea' | string
  label_zh?: string
  label_en?: string
  required?: boolean
  default?: string
  options?: Array<{ value: string; label: string }>
  /** 提示文案;i18n key appStore.hint_<hint>,缺失时显示原文 */
  hint?: string
  /** 密码类参数:可自动生成 */
  random?: boolean
}

/** 应用列表响应(/apps) */
export interface AppListResponse {
  apps: AppItem[]
  categories: string[]
}

/** 安装/卸载/升级通用响应 */
export interface AppOperationResponse {
  ok: boolean
}

/** Compose 渲染预览响应(/apps/:key/preview) */
export interface AppPreviewResponse {
  yaml: string
}

/** 安装请求体 */
export interface AppInstallReq {
  params: Record<string, string>
  yaml?: string
}
