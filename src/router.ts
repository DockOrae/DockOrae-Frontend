import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { getToken, getPublicConfig } from './api'

// 路由 meta 扩展:public = 无需登录;title = 页面标题 i18n key
declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    title?: string
  }
}

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('./views/LoginView.vue'), meta: { public: true } },
  // 字体验收页(仅开发模式,不在导航中,可直接访问 /typography;生产构建不注册)
  ...(import.meta.env.DEV
    ? [{ path: '/typography', name: 'typography', component: () => import('./views/TypographyView.vue'), meta: { public: true } }]
    : []),
  {
    path: '/',
    component: () => import('./layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'dashboard', component: () => import('./views/DashboardView.vue'), meta: { title: 'nav.systemStatus' } },
      { path: 'apps', name: 'appstore', component: () => import('./views/AppStoreView.vue'), meta: { title: 'nav.appStore' } },
      { path: 'containers', name: 'containers', component: () => import('./views/ContainersView.vue'), meta: { title: 'nav.containers' } },
      { path: 'containers/new', name: 'container-create', component: () => import('./views/ContainerCreateView.vue'), meta: { title: 'createContainer.title' } },
      { path: 'containers/:id', name: 'container-detail', component: () => import('./views/ContainerDetailView.vue'), meta: { title: 'containerDetail.title' } },
      { path: 'images', name: 'images', component: () => import('./views/ImagesView.vue'), meta: { title: 'nav.images' } },
      { path: 'networks', name: 'networks', component: () => import('./views/NetworksView.vue'), meta: { title: 'nav.networks' } },
      { path: 'volumes', name: 'volumes', component: () => import('./views/VolumesView.vue'), meta: { title: 'nav.volumes' } },
      // Compose 已并入容器页(2026-09-02:容器页按 compose 标签分组管理,不再独立一级导航)
      { path: 'terminal', name: 'host-terminal', component: () => import('./views/TerminalView.vue'), meta: { title: 'terminal.hostTitle' } },
      { path: 'files', name: 'host-files', component: () => import('./views/FilesView.vue'), meta: { title: 'files.title' } },
      { path: 'settings', name: 'settings', component: () => import('./views/SettingsView.vue'), meta: { title: 'nav.settings' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

// 安全入口(webBasePath)作为 router base:设置后页面 URL 带 /<入口> 前缀,
// 后端会把不带入口的请求 302 重定向到入口路径。
export async function createAppRouter() {
  const cfg = await getPublicConfig()
  const base = cfg.basePath && cfg.basePath !== '/' ? cfg.basePath.replace(/\/$/, '') : ''
  const router = createRouter({
    history: createWebHistory(base),
    routes,
  })

  router.beforeEach((to) => {
    if (!to.meta.public && !getToken()) return { name: 'login' }
    if (to.name === 'login' && getToken()) return { name: 'dashboard' }
  })

  return router
}

export default null
