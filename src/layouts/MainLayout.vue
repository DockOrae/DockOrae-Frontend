<template>
  <div class="app-shell">
    <!-- 左侧折叠侧边栏(仿 3x-ui:72px 窄栏,悬停展开 220px,可图钉固定) -->
    <div
      class="app-sider"
      :class="{ expanded: expanded || pinned, pinned }"
      @mouseenter="onEnter"
      @mouseleave="onLeave"
    >
      <!-- 品牌区:Docker 图标 + DockOrae 名字 -->
      <div class="sider-brand">
        <div class="brand-block" @click="$router.push('/')">
          <img src="/images/logo.svg" alt="logo" class="brand-logo" />
          <span v-if="expanded || pinned" class="brand-name">{{ t('app.name') }}</span>
        </div>
        <div v-if="expanded || pinned" class="brand-actions">
          <button
            type="button"
            class="brand-btn"
            :class="{ active: pinned }"
            :title="t(pinned ? 'nav.unpin' : 'nav.pin')"
            :aria-label="t(pinned ? 'nav.unpin' : 'nav.pin')"
            @click="togglePinned"
          >
            <Icon :name="pinned ? 'pinFilled' : 'pin'" size="16" />
          </button>
        </div>
      </div>

      <!-- 导航菜单 -->
      <nav class="sider-nav">
        <router-link
          v-for="item in navs"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="[
            isActive(item) ? 'active' : '',
            !(expanded || pinned) ? 'is-collapsed' : '',
          ]"
          :title="expanded || pinned ? '' : t(item.labelKey)"
        >
          <Icon :name="item.icon" size="16" class="nav-icon" />
          <span v-if="expanded || pinned" class="nav-label">
            <template v-for="(p, i) in splitLatin(t(item.labelKey))" :key="i">
              <span v-if="p.latin" class="latin">{{ p.seg }}</span>
              <template v-else>{{ p.seg }}</template>
            </template>
          </span>
        </router-link>

        <!-- 面板设置(点击展开子菜单:所有设置项,仿 3x-ui;父级不高亮,只高亮选中的子项) -->
        <div class="menu-group">
          <button
            type="button"
            class="nav-item"
            :class="[
              !(expanded || pinned) ? 'is-collapsed' : '',
            ]"
            @click="toggleSettingsMenu"
            :title="expanded || pinned ? '' : t('settings.panelSettings')"
          >
            <Icon name="settings" size="16" class="nav-icon" />
            <span v-if="expanded || pinned" class="nav-label">
              <template v-for="(p, i) in splitLatin(t('settings.panelSettings'))" :key="i">
                <span v-if="p.latin" class="latin">{{ p.seg }}</span>
                <template v-else>{{ p.seg }}</template>
              </template>
            </span>
            <Icon v-if="expanded || pinned" name="chevronsUp" size="11" class="nav-caret" :class="{ open: settingsOpen }" />
          </button>
          <Transition name="dm-sub">
            <div v-if="(expanded || pinned) && settingsOpen" class="menu-sub">
              <router-link
                v-for="sub in settingsSubs"
                :key="sub.hash"
                :to="'/settings' + sub.hash"
                class="sub-item"
                :class="{ active: isSettingsChild && route.path === '/settings' && route.hash === sub.hash }"
              >
                <Icon :name="sub.icon" size="14" class="sub-icon" />
                <template v-for="(p, i) in splitLatin(t(sub.labelKey))" :key="i">
                  <span v-if="p.latin" class="latin">{{ p.seg }}</span>
                  <template v-else>{{ p.seg }}</template>
                </template>
              </router-link>
            </div>
          </Transition>
        </div>
      </nav>

      <!-- 底部:登出(仿 3x-ui sider-utility;GitHub 入口顶栏已有,不重复) -->
      <div class="sider-footer">
        <button type="button" class="logout-item" :class="{ 'is-collapsed': !expanded }" @click="logout">
          <Icon name="logout" size="15" class="nav-icon" />
          <span v-if="expanded" class="nav-label">{{ t('nav.logout') }}</span>
        </button>
      </div>
    </div>

    <!-- 主区域 -->
    <div :class="['panel-main', { expanded: expanded || pinned }]">
      <header class="app-header">
        <h1 class="page-title">
          <template v-for="(p, i) in splitLatin(pageTitle)" :key="i">
            <span v-if="p.latin" class="latin">{{ p.seg }}</span>
            <template v-else>{{ p.seg }}</template>
          </template>
        </h1>
        <div class="header-actions">
          <ThemeToggle />
          <ToggleLocale />
          <a
            href="https://doc.kejizero.xyz"
            target="_blank"
            rel="noopener"
            class="header-btn"
            :title="t('app.docs')"
          >
            <BookOpenText class="size-[18px]" />
          </a>
          <a
            href="https://github.com/DockOrae/DockOrae"
            target="_blank"
            rel="noopener"
            class="header-btn"
            :title="t('app.github')"
          >
            <Icon name="github" size="18" filled />
          </a>
        </div>
      </header>

      <!-- 默认密码警告横幅 -->
      <div
        v-if="user.mustChangePassword"
        class="pwd-banner"
      >
        <Icon name="alert" size="15" class="shrink-0" />
        <span class="flex-1">{{ t('banner.changePwd') }}</span>
        <router-link to="/settings#security" class="pwd-banner-link">
          {{ t('banner.goSettings') }}
        </router-link>
      </div>

      <main class="app-main">
        <router-view v-slot="{ Component }">
          <keep-alive include="DashboardView">
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </main>

      <footer class="app-footer">
        <a href="https://github.com/MinimaxFlora" target="_blank" rel="noopener" class="hover:text-brand transition-colors" :class="{ latin: hasLatin('Copyright © ' + year + ' MinimaxFlora') }">
          Copyright © {{ year }} MinimaxFlora
        </a>
        <div class="ml-auto flex items-center gap-3">
          <a href="https://github.com/DockOrae/DockOrae" target="_blank" rel="noopener" class="hover:text-brand transition-colors" :class="{ latin: hasLatin(t('footer.project')) }">
            {{ t('footer.project') }}
          </a>
          <span class="text-muted">|</span>
          <a href="https://github.com/DockOrae/DockOrae#readme" target="_blank" rel="noopener" class="hover:text-brand transition-colors" :class="{ latin: hasLatin(t('footer.manual')) }">
            {{ t('footer.manual') }}
          </a>
          <span class="text-muted">|</span>
          <span class="flex items-center gap-1.5">
            <span :class="[licenseActive ? 'text-brand font-semibold' : '', { latin: hasLatin(t(licenseActive ? 'license.pro' : 'license.community')) }]">
              {{ licenseActive ? t('license.pro') : t('license.community') }}
            </span>
            <button
              type="button"
              class="relative px-2 py-1 rounded-md bg-surface2 border border-line text-muted hover:text-brand transition-colors"
              :title="updateInfo?.has_update ? t('update.available') : t('update.title')"
              @click="updateOpen = true"
            >
              <Icon name="download" size="16" />
              <span v-if="updateInfo?.has_update" class="update-dot" />
            </button>
          </span>
        </div>
      </footer>
    </div>

    <UpdateModal :open="updateOpen" @close="updateOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { BookOpenText } from '@lucide/vue'
import Icon from '../components/Icon.vue'
import ToggleLocale from '../components/ToggleLocale.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import UpdateModal from '../components/UpdateModal.vue'
import { getToken, setToken, checkUpdate } from '../api'
import { licenseActive, connectLicenseWS, disconnectLicenseWS, resetUser, user } from '../store'
import type { IconName } from '../icons'
import type { UpdateInfo } from '../types'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const PINNED_KEY = 'dm_sidebar_pinned'

// 在线更新:进入面板检查一次,之后每 10 分钟静默刷新(后端有 10 分钟缓存,不会打爆 GitHub API)
const updateOpen = ref(false)
const updateInfo = ref<UpdateInfo | null>(null)
async function loadUpdate() {
  try {
    updateInfo.value = await checkUpdate()
  } catch { /* 网络/API 故障静默,不影响面板使用 */ }
}
onMounted(() => {
  loadUpdate()
  // V3 License 实时同步:WS 推送状态变化(Vue 自动更新,无需刷新页面)
  connectLicenseWS()
})
setInterval(loadUpdate, 10 * 60 * 1000)

// 3x-ui 交互:默认折叠,悬停展开;图钉固定后保持展开
// 防闪屏:鼠标离开侧边栏后延迟收起(300ms),避免滑向内容区瞬间展开/收起动画叠加导致布局跳动
const hovered = ref(false)
const pinned = ref(localStorage.getItem(PINNED_KEY) === 'true')
const expanded = computed(() => hovered.value || pinned.value)
const year = new Date().getFullYear()
let siderLeaveTimer: ReturnType<typeof setTimeout> | null = null

function onEnter() {
  if (siderLeaveTimer) {
    clearTimeout(siderLeaveTimer)
    siderLeaveTimer = null
  }
  hovered.value = true
}
function onLeave() {
  if (siderLeaveTimer) clearTimeout(siderLeaveTimer)
  siderLeaveTimer = setTimeout(() => {
    hovered.value = false
  }, 300)
}
function togglePinned() {
  pinned.value = !pinned.value
  localStorage.setItem(PINNED_KEY, pinned.value ? 'true' : 'false')
}

function isActive(item: { to: string }) {
  if (item.to === '/') return route.path === '/'
  return route.path.startsWith(item.to)
}

// 从 JWT 解析用户名(登录后 /me 会刷新完整资料)
const usernameFromToken = ref<string>('')
try {
  const payload = (getToken() || '').split('.')[1]
  if (payload) usernameFromToken.value = (JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: string }).sub || ''
} catch { /* ignore */ }
if (!user.username && usernameFromToken.value) {
  user.username = usernameFromToken.value
}

interface NavItem {
  to: string
  labelKey: string
  icon: IconName
}

const navs: NavItem[] = [
  { to: '/', labelKey: 'nav.systemStatus', icon: 'dashboard' },
  { to: '/apps', labelKey: 'nav.appStore', icon: 'store' },
  { to: '/containers', labelKey: 'nav.containers', icon: 'container' },
  { to: '/images', labelKey: 'nav.images', icon: 'image' },
  { to: '/networks', labelKey: 'nav.networks', icon: 'network' },
  { to: '/volumes', labelKey: 'nav.volumes', icon: 'volume' },
  { to: '/compose', labelKey: 'nav.compose', icon: 'compose' },
  // 宿主机管理(§55/§56):终端 / 文件,位于「面板设置」紧上方
  { to: '/terminal', labelKey: 'nav.terminal', icon: 'terminal' },
  { to: '/files', labelKey: 'nav.files', icon: 'folder' },
]

// 面板设置子菜单(仿 3x-ui:常规/安全/TG/邮件/许可证/关于;证书与日期时间在常规页内横向 tab)
// 图标各自独立:常规=调谐滑块、安全=锁、TG=小飞机、邮件=信封、许可证=钥匙、关于=信息
interface SettingsSubItem {
  hash: string
  labelKey: string
  icon: IconName
}

const settingsSubs: SettingsSubItem[] = [
  { hash: '#general', labelKey: 'settings.general', icon: 'tune' },
  { hash: '#security', labelKey: 'settings.securitySettings', icon: 'lock' },
  { hash: '#telegram', labelKey: 'settings.telegramBot', icon: 'send' },
  { hash: '#email', labelKey: 'settings.emailSettings', icon: 'mail' },
  { hash: '#license', labelKey: 'license.title', icon: 'key' },
  { hash: '#about', labelKey: 'settings.about', icon: 'info' },
]

// 设置页子页标题(header 标题跟随子选项名称:保存按钮上方的"设置"→ 当前子选项)
const settingsTitleKeys: Record<string, string> = {
  '#general': 'settings.general',
  '#cert': 'settings.certificate',
  '#datetime': 'settings.dateTime',
  '#security': 'settings.securitySettings',
  '#telegram': 'settings.telegramBot',
  '#email': 'settings.emailSettings',
  '#license': 'license.title',
  '#about': 'settings.about',
}
const pageTitle = computed<string>(() => {
  if (route.path === '/settings' && settingsTitleKeys[route.hash]) return t(settingsTitleKeys[route.hash])
  return t(String(route.meta.title || ''))
})

// 标签含英文(如 Compose 栈 / Telegram 机器人)时英文段单独放小,中文保持原字号
function hasLatin(s: string): boolean {
  return /[A-Za-z]/.test(s || '')
}
// 把文本切成"英文段/非英文段",英文段渲染为 .latin(字号略小)
function splitLatin(s: string): Array<{ seg: string; latin: boolean }> {
  return String(s || '')
    .split(/([A-Za-z0-9]+)/)
    .filter(Boolean)
    .map((seg) => ({ seg, latin: /^[A-Za-z0-9]+$/.test(seg) }))
}
const settingsOpen = ref(false)
const isSettingsChild = computed(() => {
  if (route.path !== '/settings') return false
  return ['#general', '#cert', '#about', '#datetime', '#security', '#telegram', '#email', '#license'].includes(route.hash)
})
// 仿 3x-ui:进入设置页自动展开子菜单(人在子菜单里不收起),离开后收起
watch(
  () => route.path,
  (p) => {
    settingsOpen.value = p === '/settings'
  },
  { immediate: true }
)
function toggleSettingsMenu() {
  if (!expanded.value && !pinned.value) {
    // 折叠态:悬停已展开,点击直接进常规
    router.push('/settings#general')
    return
  }
  settingsOpen.value = !settingsOpen.value
  if (!settingsOpen.value && route.path === '/settings') {
    // 收起时若停留在子页,回到常规
    router.push('/settings#general')
  }
}

function logout() {
  setToken(null)
  disconnectLicenseWS()
  resetUser()
  router.push('/login')
}
</script>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
  background: var(--dm-bg);
}

/* ---------- 侧边栏(仿 3x-ui:左侧 72px ↔ 220px,悬停展开) ---------- */
.app-sider {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 40;
  width: 72px;
  display: flex;
  flex-direction: column;
  background: var(--dm-surface);
  border-right: 1px solid var(--dm-line);
  transition: width 0.25s ease;
  overflow: visible;
}
.app-sider.expanded {
  width: 220px;
}

/* 品牌区 */
.sider-brand {
  position: relative;
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 14px;
  border-bottom: 1px solid var(--dm-line);
  gap: 8px;
  flex-shrink: 0;
  overflow: hidden;
  white-space: nowrap;
}
.brand-block {
  display: flex;
  align-items: center;
  justify-content: center; /* 收起态:logo 居中(仿 3x-ui) */
  gap: 18px;
  min-width: 0;
  cursor: pointer;
  flex: 1;
}
/* 展开态:logo 靠左往前(用户要求),名字跟在后面 */
.app-sider.expanded .brand-block {
  justify-content: flex-start;
  padding-left: 12px;
}
.brand-logo {
  width: 30px;
  height: 30px;
  object-fit: contain;
  flex-shrink: 0;
}
.brand-name {
  /* 品牌名:艺术字体栈(英文 BlueCustard / 中文 YuanQI),纯品牌粉色(不渐变) */
  font-size: var(--fs-xl);
  font-weight: 700;
  letter-spacing: 0.5px;
  line-height: 1.2;
  padding-top: 2px;
  color: var(--color-brand);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}
/* 图钉按钮悬浮右侧,不挤占 logo 居中位置 */
.brand-actions {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
}
.brand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--dm-muted);
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
}
.brand-btn:hover,
.brand-btn.active {
  color: var(--color-brand);
  background: color-mix(in srgb, var(--color-brand) 10%, transparent);
}

/* 导航菜单(仿 3x-ui antd Menu) */
.sider-nav {
  flex: 1;
  padding: 8px 6px;
  overflow-y: auto;
  overflow-x: hidden;
}
.nav-item {
  display: flex;
  align-items: center;
  justify-content: center; /* 菜单项内容居中(展开/收起一致) */
  gap: 10px;
  height: 44px;
  margin: 4px 0;
  padding: 0 12px;
  border-radius: 8px;
  font-size: var(--fs-xl2);
  font-weight: 500;
  color: var(--dm-muted);
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}
.nav-item:hover {
  color: var(--dm-text);
  background: var(--dm-surface2);
}
/* 选中态(仿 3x-ui AppSidebar.css:主题色 20% 背景块 + 主题色文字,即"底光标") */
.nav-item.active {
  color: var(--color-brand);
  background: color-mix(in srgb, var(--color-brand) 20%, transparent);
}
.nav-item {
  position: relative;
}
.nav-item.is-collapsed {
  justify-content: center;
  padding: 0;
  gap: 0;
}
.nav-item.is-collapsed .nav-label {
  display: none;
}
/* 菜单标签内英文段(Compose / Telegram 等)单独放小,中文保持 19px */
.nav-label .latin,
.sub-item .latin {
  font-size: var(--fs-md);
}
.nav-item.is-collapsed .nav-icon {
  margin: 0;
}
.nav-icon {
  flex-shrink: 0;
}

/* 面板设置按钮(<button> 的 width:auto 是 fit-content,必须显式占满,
   否则收起态按钮只包住图标贴在左侧、图标不居中) */
.menu-group .nav-item {
  width: 100%;
}

/* 面板设置子菜单(仿 3x-ui antd Menu:子项带图标) */
/* caret 绝对定位右侧,不参与 flex 布局 —— 否则 margin-left:auto 会把
   图标+文字整体挤到左侧,与其余菜单项(内容居中)不一致 */
.nav-caret {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--dm-muted);
  transition: transform 0.2s;
  flex-shrink: 0;
}
.nav-caret.open {
  transform: translateY(-50%) rotate(180deg);
}
.menu-sub {
  padding: 2px 0 6px;
}
/* 面板设置子菜单展开/收起动画(入场/离场淡入下滑) */
.dm-sub-enter-active,
.dm-sub-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.dm-sub-enter-from,
.dm-sub-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.sub-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center; /* 与主菜单项一致:内容居中 */
  gap: 8px;
  height: 36px;
  margin: 2px 4px;
  padding: 0 10px;
  border-radius: 8px;
  color: var(--dm-muted);
  font-size: var(--fs-xl2);
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}
.sub-item:hover {
  color: var(--dm-text);
  background: var(--dm-surface2);
}
.sub-item.active {
  background: color-mix(in srgb, var(--color-brand) 20%, transparent);
  color: var(--color-brand);
  font-weight: 600;
}
.sub-icon {
  flex-shrink: 0;
  color: currentColor;
  opacity: 0.85;
}

/* 底部登出(仿 3x-ui sider-utility) */
.sider-footer {
  border-top: 1px solid var(--dm-line);
  padding: 8px 6px;
  flex-shrink: 0;
}
.logout-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 40px;
  margin: 4px 0;
  padding: 0 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #f87171;
  font-size: var(--fs-lg2);
  font-weight: 500;
  cursor: pointer;
  text-align: center;
  white-space: nowrap;
  transition: background 0.15s;
}
.logout-item:hover {
  background: rgba(248, 113, 113, 0.12);
}
.logout-item.is-collapsed {
  justify-content: center;
  padding: 0;
}
.logout-item.is-collapsed .nav-label {
  display: none;
}

/* 页脚更新按钮红点(有更新时亮起) */
.update-dot {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ec4899;
  border: 1.5px solid var(--dm-bg, #0f172a);
}

/* ---------- 主区域 ---------- */
.panel-main {
  flex: 1;
  min-width: 0;
  margin-left: 72px;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  transition: margin-left 0.25s ease;
}
.panel-main.expanded {
  margin-left: 220px;
}

.app-header {
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 20px;
  gap: 12px;
  background: var(--dm-bg);
  border-bottom: 1px solid var(--dm-line);
  flex-shrink: 0;
}
.page-title {
  font-size: var(--fs-2xl);
  font-weight: 600;
  color: var(--dm-text);
}
/* 页标题内英文段(Compose 栈 / Telegram 机器人)单独放小,中文保持 22px */
.page-title .latin {
  font-size: var(--fs-xl);
}
.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
}
.header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  border: 1px solid var(--dm-line);
  background: var(--dm-surface2);
  color: var(--dm-muted);
  transition: all 0.2s;
}
.header-btn:hover {
  color: var(--color-brand);
  border-color: var(--color-brand);
  background: rgba(236, 72, 153, 0.08);
}
/* 主题/语言按钮(shadcn Button)与文档/GitHub 按钮同款圆框 */
.app-header :deep(.header-actions button) {
  width: 36px;
  height: 36px;
  min-width: 36px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--dm-line);
  background: var(--dm-surface2);
  color: var(--dm-muted);
  transition: all 0.2s;
}
.app-header :deep(.header-actions button:hover) {
  color: var(--color-brand);
  border-color: var(--color-brand);
  background: rgba(236, 72, 153, 0.08);
}

.pwd-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 20px;
  font-size: var(--fs-md2);
  background: rgba(245, 158, 11, 0.14);
  border-bottom: 1px solid rgba(245, 158, 11, 0.3);
  color: #fbbf24;
  flex-shrink: 0;
}
.pwd-banner-link {
  padding: 3px 10px;
  border-radius: 8px;
  background: rgba(245, 158, 11, 0.2);
  font-weight: 500;
  text-decoration: none;
  color: #fbbf24;
  flex-shrink: 0;
}

.app-main {
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px;
}

.app-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  font-size: var(--fs-lg2);
  color: var(--dm-footer-color);
  background: var(--dm-surface);
  border-top: 1px solid var(--dm-line);
  flex-shrink: 0;
  flex-wrap: wrap;
}
/* 页脚含英文的项(Copyright 行 / Project / Manual / Community)略小 */
.app-footer .latin {
  font-size: var(--fs-md2);
}
</style>
