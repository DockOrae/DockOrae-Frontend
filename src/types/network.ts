/**
 * 网络相关类型(后端 internal/model/network.go 精简结构)。
 */

/** 网络列表项 */
export interface NetworkListItem {
  Id: string
  Name: string
  Driver: string
  Scope: string
  IPAM: {
    Driver?: string
    Config?: Array<{ Subnet?: string; Gateway?: string }>
  }
  /** inspect 时包含容器端点(列表接口为空) */
  Containers?: Record<string, unknown>
}

/** 创建网络请求(后端 model.CreateNetworkReq) */
export interface CreateNetworkReq {
  name: string
  driver?: string | null
  subnet?: string | null
  gateway?: string | null
  internal?: boolean
}

/** 网络 prune 报告 */
export interface NetworkPruneReport {
  NetworksDeleted?: string[]
}
