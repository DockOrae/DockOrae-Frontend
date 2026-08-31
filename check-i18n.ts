/**
 * 校验 i18n key 完整性:源码用到的 key 必须存在于 3 个语言包(zh-CN/zh-TW/en)。
 * Node ≥ 23.6 原生 TypeScript 类型剥离执行(node check-i18n.ts,无需编译)。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = join(__dirname, 'src')

function collectKeys(text: string): Set<string> {
  const keys = new Set<string>()
  // 排除动态 import('...') 等标识符后缀误匹配
  const re = /(?<![A-Za-z0-9_])t\(\s*['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) keys.add(m[1])
  return keys
}

function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') Object.assign(out, flatten(v as Record<string, unknown>, key))
    else out[key] = v
  }
  return out
}

// 收集源码使用的 key
const used = new Set<string>()
function walk(dir: string): void {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (f === 'locales' || f === 'node_modules' || f === 'dist' || f === '.git') continue
    if (statSync(p).isDirectory()) walk(p)
    else if (f.endsWith('.vue') || f.endsWith('.js') || f.endsWith('.ts')) {
      for (const k of collectKeys(readFileSync(p, 'utf8'))) used.add(k)
    }
  }
}
walk(SRC)

// 加载语言包(Node 24 类型剥离直接 import .ts)
const langs: Record<string, Record<string, unknown>> = {}
for (const f of readdirSync(join(SRC, 'locales'))) {
  if (!f.endsWith('.ts')) continue
  const code = f.replace(/\.ts$/, '')
  const mod = (await import(`./src/locales/${f}`)) as { default: Record<string, unknown> }
  langs[code] = flatten(mod.default)
}

console.log('使用中的 key 总数:', used.size)
const zh = langs['zh-CN'] ?? {}
const missingZh = [...used].filter((k) => !(k in zh)).sort()
console.log('zh-CN 缺失:', missingZh.length ? missingZh : '无 ✅')

for (const [code, d] of Object.entries(langs)) {
  const missing = Object.keys(zh).filter((k) => !(k in d))
  const extra = Object.keys(d).filter((k) => !(k in zh))
  console.log(`${code}: 缺失 ${missing.length} ${missing.length ? missing : '✅'} | 多余 ${extra.length} ${extra.length ? extra : '✅'}`)
}

// 残留中文(非注释、非属性)
console.log('\n残留中文检查:')
let found = false
function walk2(dir: string): void {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (f === 'locales' || f === 'node_modules' || f === 'dist' || f === '.git') continue
    if (statSync(p).isDirectory()) walk2(p)
    else if (f.endsWith('.vue') || f.endsWith('.js') || f.endsWith('.ts')) {
      const lines = readFileSync(p, 'utf8').split('\n')
      lines.forEach((line, i) => {
        if (/[\u4e00-\u9fff]/.test(line)) {
          const s = line.trim()
          if (s.startsWith('//') || s.startsWith('/*') || s.startsWith('*') || s.startsWith('<!--')) return
          found = true
          console.log(`  ${relative(SRC, p)}:${i + 1}: ${s.slice(0, 90)}`)
        }
      })
    }
  }
}
walk2(SRC)
if (!found) console.log('  无 ✅')
