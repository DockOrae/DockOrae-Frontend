// DockOrae 字体验收:登录 → 各页截图(暗/亮/移动)+ 字体加载断言 + console 收集
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5173'
const OUT = 'shots'
fs.mkdirSync(OUT, { recursive: true })

const consoleIssues = []
const pageErrors = []

async function newPage(browser, viewport) {
  const p = await browser.newPage()
  await p.setViewport(viewport)
  p.on('console', (m) => {
    if (m.type() === 'error') consoleIssues.push(`[console] ${m.text().slice(0, 200)}`)
  })
  p.on('pageerror', (e) => pageErrors.push(`[pageerror] ${String(e).slice(0, 300)}`))
  return p
}

async function login(page) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle0', timeout: 30000 })
  await page.waitForSelector('.f-input', { timeout: 10000 })
  const inputs = await page.$$('.f-input')
  await inputs[0].evaluate((el) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, 'admin')
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await inputs[1].evaluate((el) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, 'admin123')
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.evaluate(() => document.querySelector('.login-form')?.requestSubmit())
  await page.waitForFunction(() => location.pathname === '/' || location.pathname.endsWith('/'), {
    timeout: 15000,
  })
  await new Promise((r) => setTimeout(r, 1500))
}

async function shot(page, name) {
  await new Promise((r) => setTimeout(r, 800))
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('saved', name)
}

// 字体加载 + 计算样式断言
async function assertFonts(page, tag) {
  const r = await page.evaluate(() => {
    const cs = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const s = getComputedStyle(el)
      return { font: s.fontFamily, size: s.fontSize, lh: s.lineHeight }
    }
    return {
      blue: document.fonts.check('19px BlueCustard'),
      yuan: document.fonts.check('19px YuanQI'),
      body: cs('body'),
      button: cs('button'),
      input: cs('input'),
      table: cs('table'),
    }
  })
  console.log(`[fonts:${tag}] BlueCustard=${r.blue} YuanQI=${r.yuan}`)
  console.log(`[fonts:${tag}] body=${JSON.stringify(r.body)}`)
  console.log(`[fonts:${tag}] button=${JSON.stringify(r.button)} input=${JSON.stringify(r.input)} table=${JSON.stringify(r.table)}`)
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1'],
  })

  // ---- 桌面暗色 ----
  const page = await newPage(browser, { width: 1440, height: 900 })
  await page.goto(BASE + '/login', { waitUntil: 'networkidle0' })
  await page.waitForSelector('.brand-name, .login-form', { timeout: 10000 })
  await shot(page, '01-login-dark')
  await assertFonts(page, 'login')

  await login(page)
  await page.waitForSelector('.count-card, .app-main', { timeout: 15000 })
  await shot(page, '02-dashboard-dark')
  await assertFonts(page, 'dashboard')

  // 容器页
  await page.goto(BASE + '/containers', { waitUntil: 'networkidle0' })
  await page.waitForSelector('tbody tr', { timeout: 10000 })
  await shot(page, '03-containers-dark')

  // 镜像页
  await page.goto(BASE + '/images', { waitUntil: 'networkidle0' })
  await page.waitForSelector('tbody tr', { timeout: 10000 })
  await shot(page, '04-images-dark')

  // 设置页(面板设置)
  await page.goto(BASE + '/settings#general', { waitUntil: 'networkidle0' })
  await page.waitForSelector('.setting-row, .h-tab', { timeout: 10000 })
  await shot(page, '05-settings-dark')

  // 应用商店
  await page.goto(BASE + '/apps', { waitUntil: 'networkidle0' })
  await page.waitForSelector('.app-title, .app-card, [class*="grid"]', { timeout: 10000 })
  await shot(page, '06-appstore-dark')

  // 字体验收页
  await page.goto(BASE + '/typography', { waitUntil: 'networkidle0' })
  await page.waitForSelector('.typo-card', { timeout: 10000 })
  await shot(page, '07-typography-dark')
  const fs = await page.evaluate(() => document.querySelectorAll('.font-status-item').length)
  console.log('typography font-status items:', fs)

  // ---- 亮色 ----
  await page.evaluate(() => document.querySelector('[data-theme]')?.setAttribute('data-theme', 'light') || document.documentElement.setAttribute('data-theme', 'light'))
  await new Promise((r) => setTimeout(r, 600))
  await shot(page, '08-typography-light')
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' })
  await new Promise((r) => setTimeout(r, 1500))
  await shot(page, '09-dashboard-light')

  // ---- 移动端 390×844 ----
  const mp = await newPage(browser, { width: 390, height: 844, isMobile: true, hasTouch: true })
  await mp.goto(BASE + '/', { waitUntil: 'networkidle0' })
  await new Promise((r) => setTimeout(r, 1500))
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  console.log('mobile dashboard overflow:', overflow)
  await shot(mp, '10-mobile-dashboard')

  await mp.goto(BASE + '/settings#general', { waitUntil: 'networkidle0' })
  await new Promise((r) => setTimeout(r, 1200))
  const overflowS = await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  console.log('mobile settings overflow:', overflowS)
  await shot(mp, '11-mobile-settings')

  await mp.goto(BASE + '/typography', { waitUntil: 'networkidle0' })
  await new Promise((r) => setTimeout(r, 1200))
  const overflowT = await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  console.log('mobile typography overflow:', overflowT)
  await shot(mp, '12-mobile-typography')

  await browser.close()

  console.log('\n===== CONSOLE ERRORS (' + consoleIssues.length + ') =====')
  const wsRelated = consoleIssues.filter((e) => e.includes('WebSocket'))
  const others = consoleIssues.filter((e) => !e.includes('WebSocket'))
  console.log('WebSocket(license WS mock 不支持,预期):', wsRelated.length)
  others.forEach((e) => console.log(e))
  console.log('\n===== PAGE ERRORS (' + pageErrors.length + ') =====')
  pageErrors.forEach((e) => console.log(e))
}

main().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
