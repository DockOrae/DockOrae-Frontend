// DockOrae VPS 真机 UI 验证(2026-09-02):容器页分组 + 终端 + 事件自动刷新 + 字体
// 本机运行,连 VPS 面板 https://nn.kejizero.xyz(真机 Docker 数据)
const path = require('path')
const puppeteer = require('puppeteer-core')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = path.join(__dirname, 'shots')
const BASE = process.env.VPS_BASE || 'https://nn.kejizero.xyz'
const IGNORE_SSL = process.env.VPS_IGNORE_SSL === '1'

async function login(page) {
  await page.goto(BASE + '/login', { waitUntil: 'load' })
  // 等待输入框渲染(VPS 走 HTTPS,加载较慢)
  for (let i = 0; i < 15; i++) {
    const ready = await page.evaluate(() => !!document.querySelector('input[type=password]'))
    if (ready) break
    await new Promise((r) => setTimeout(r, 500))
  }
  await new Promise((r) => setTimeout(r, 500))
  await page.evaluate(() => {
    const setVal = (el, val) => {
      const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')
      if (desc && desc.set) desc.set.call(el, val)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
    const u = document.querySelector('input:not([type=password])')
    const p = document.querySelector('input[type=password]')
    if (u) setVal(u, 'admin')
    if (p) setVal(p, '123456')
  })
  await new Promise((r) => setTimeout(r, 400))
  // 重试点击登录直到跳转
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => /登\s*录|Log\s*in|Sign\s*in/i.test(b.textContent))
      if (btn) btn.click()
    })
    await new Promise((r) => setTimeout(r, 1500))
    const url = page.url()
    if (!url.includes('/login')) {
      console.log('login ok ->', url)
      return
    }
  }
  console.log('WARN: still on login page, url =', page.url())
}

;(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', ...(IGNORE_SSL ? ['--ignore-certificate-errors'] : [])],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1500, height: 950 })
  await login(page)
  console.log('logged in, url =', page.url())

  // 1. 容器页分组(真机数据)
  await page.goto(BASE + '/containers', { waitUntil: 'load' })
  await new Promise((r) => setTimeout(r, 4000))
  const pageState = await page.evaluate(() => ({
    url: location.pathname,
    headings: [...document.querySelectorAll('h1, h2, .page-title')].map((h) => h.textContent.trim()).slice(0, 5),
    cards: document.querySelectorAll('.app-main .space-y-3 > div').length,
    hasTerminalBtns: [...document.querySelectorAll('button[title]')].filter((b) => b.title.includes('终端')).length,
  }))
  console.log('page state:', JSON.stringify(pageState))
  await page.screenshot({ path: path.join(OUT, 'vps-1-groups.png') })
  const groups = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.app-main .space-y-3 > .overflow-hidden')]
    return cards.map((c) => {
      const name = c.querySelector('.font-semibold')?.textContent || ''
      const count = c.querySelector('.shrink-0.text-\\[11px\\]')?.textContent || ''
      const badge = c.querySelector('.rounded-full')?.textContent || ''
      return { name, count, badge }
    })
  })
  console.log('VPS groups:', JSON.stringify(groups))

  // 2. 终端:输入命令 → 执行 → 输出(真机 docker exec)
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button[title]')].find((b) => b.title === '终端')
    if (btn) btn.click()
  })
  await new Promise((r) => setTimeout(r, 1200))
  await page.evaluate(() => {
    const ta = document.querySelector('body textarea')
    if (!ta) return
    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ta), 'value')
    if (desc && desc.set) desc.set.call(ta, 'nginx -v 2>&1; echo exit=$?')
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await new Promise((r) => setTimeout(r, 300))
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('body button')].find((b) => /执\s*行/.test(b.textContent))
    if (btn) btn.click()
  })
  await new Promise((r) => setTimeout(r, 2500))
  await page.screenshot({ path: path.join(OUT, 'vps-2-exec.png') })
  const execOut = await page.evaluate(() => {
    const panel = [...document.querySelectorAll('body .code-panel')]
    return panel.length ? panel[panel.length - 1].textContent : ''
  })
  console.log('VPS exec output:', JSON.stringify(execOut.slice(0, 250)))

  // 3. 错误命令不崩溃
  await page.evaluate(() => {
    const ta = document.querySelector('body textarea')
    if (!ta) return
    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ta), 'value')
    if (desc && desc.set) desc.set.call(ta, 'command_that_does_not_exist')
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await new Promise((r) => setTimeout(r, 300))
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('body button')].find((b) => /执\s*行/.test(b.textContent))
    if (btn) btn.click()
  })
  await new Promise((r) => setTimeout(r, 2500))
  await page.screenshot({ path: path.join(OUT, 'vps-3-exec-error.png') })
  const errOut = await page.evaluate(() => {
    const panel = [...document.querySelectorAll('body .code-panel')]
    return panel.length ? panel[panel.length - 1].textContent : ''
  })
  console.log('VPS exec error output:', JSON.stringify(errOut.slice(0, 250)))
  await page.keyboard.press('Escape')
  await new Promise((r) => setTimeout(r, 500))

  // 4. 事件自动刷新 + 终端按钮消失:外部 docker stop(本机 SSH 触发)
  const targetId = process.env.TEST_CONTAINER || ''
  if (targetId) {
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button[title]')].find((b) => b.title === '终端')
      if (btn) btn.click()
    })
    await new Promise((r) => setTimeout(r, 1000))
    await page.screenshot({ path: path.join(OUT, 'vps-4-before-stop.png') })
    const { execSync } = require('child_process')
    execSync(`ssh -o BatchMode=yes vps "docker stop ${targetId}"`, { stdio: 'pipe' })
    console.log('docker stop ' + targetId + ' triggered')
    await new Promise((r) => setTimeout(r, 4000))
    const after = await page.evaluate(() => {
      const warn = [...document.querySelectorAll('body .text-warn, body .text-\\[\\#fbbf24\\]')].map((e) => e.textContent.trim())
      const ta = document.querySelector('body textarea')
      return { warn, inputDisabled: ta ? ta.disabled : null }
    })
    console.log('after stop:', JSON.stringify(after))
    await page.screenshot({ path: path.join(OUT, 'vps-5-after-stop.png') })
  }

  // 5. 字体:页面字体栈生效(BlueCustard/YuanQI)
  const fonts = await page.evaluate(() => {
    const body = getComputedStyle(document.body)
    return { fontFamily: body.fontFamily.slice(0, 120) }
  })
  console.log('VPS body font:', JSON.stringify(fonts))

  await browser.close()
  console.log('DONE')
})().catch((e) => { console.error('ERR', e); process.exit(1) })
