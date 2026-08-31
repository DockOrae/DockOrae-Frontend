import type { ContainerListItem, PortSummary } from './types'

/** 从 unknown 错误中提取消息(TS strict 下 catch 变量为 unknown) */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function formatBytes(n: number | null | undefined, digits = 1): string {
  if (n == null || isNaN(n)) return '-'
  if (n === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)))
  return `${(n / Math.pow(1024, i)).toFixed(digits)} ${units[i]}`
}

export function formatDate(ts: number | null | undefined): string {
  if (!ts) return '-'
  const d = new Date(ts * 1000)
  const p = (x: number): string => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function containerName(c: ContainerListItem | null | undefined): string {
  if (!c || !c.Names || !c.Names.length) return c?.Id?.slice(0, 12) || '-'
  return c.Names[0].replace(/^\//, '')
}

export function shortId(id: string, n = 12): string {
  return (id || '').slice(0, n)
}

export function humanPorts(ports: PortSummary[] | null | undefined): string {
  if (!ports || !ports.length) return '-'
  return ports
    .map((p) => {
      const ip = p.IP || '0.0.0.0'
      if (p.PublicPort) return `${ip}:${p.PublicPort}->${p.PrivatePort}/${p.Type || 'tcp'}`
      return `${p.PrivatePort}/${p.Type || 'tcp'}`
    })
    .join(', ')
}

export function imageTag(repoTags: string[] | null | undefined, id: string): string {
  if (repoTags && repoTags.length) return repoTags[0]
  return shortId(id, 19)
}

export const STATE_COLOR: Record<string, string> = {
  running: 'ok',
  exited: 'muted',
  stopped: 'muted',
  created: 'info',
  restarting: 'warn',
  paused: 'warn',
  dead: 'danger',
  removing: 'warn',
}
