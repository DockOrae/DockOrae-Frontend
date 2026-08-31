<template>
  <div class="typo-page">
    <div class="typo-wrap">
      <!-- 页头:字体加载状态 -->
      <div class="flex items-center justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 class="typo-h1">DockOrae 艺术字体体系</h1>
          <p class="typo-sub">Typography Showcase · 开发验收页(不在导航中) · 全应用统一字体栈 <code>--font-art</code>:BlueCustard → YuanQI</p>
        </div>
        <div class="font-status">
          <span v-for="f in fontStatus" :key="f.name" class="font-status-item" :class="f.ok ? 'ok' : 'fail'">
            <span class="dot" /> {{ f.name }} {{ f.ok ? '已加载 ✓' : '未加载 ✗' }}
          </span>
        </div>
      </div>

      <!-- 1. Display / 品牌 -->
      <section class="typo-card">
        <div class="typo-card-head"><span class="tk">--fs-hero · 48px</span> Display / 品牌</div>
        <div class="brand-display">DockOrae</div>
        <div class="brand-sub">Docker 管理平台 · Docker Management Platform</div>
      </section>

      <!-- 2. Heading / Title -->
      <section class="typo-card">
        <div class="typo-card-head"><span class="tk">--text-2xl · 28.5px / --fs-2xl · 22px</span> Heading / 标题</div>
        <div class="grid md:grid-cols-2 gap-x-8 gap-y-3">
          <div class="h-heading">系统状态 System Status</div>
          <div class="h-heading">容器 Containers</div>
          <div class="h-title">镜像 Images</div>
          <div class="h-title">网络 Networks</div>
          <div class="h-title">存储卷 Volumes</div>
          <div class="h-title">设置 Settings</div>
        </div>
      </section>

      <!-- 3. Body / 正文 -->
      <section class="typo-card">
        <div class="typo-card-head"><span class="tk">--text-base · 20.2px</span> Body / 正文(中文 / 英文 / 混排)</div>
        <p class="body-cn">DockOrae 面板用于管理 Docker 容器、镜像、网络与存储卷,支持一键部署应用商店,并内置在线更新与授权管理。</p>
        <p class="body-en">DockOrae panel manages Docker containers, images, networks and volumes, deploys apps from the App Store with one click, and ships with built-in update and license management.</p>
        <p class="body-mix">已安装 12 个应用,其中 3 个可升级 · 3 apps can be updated to v1.2.3</p>
      </section>

      <!-- 4. Label / Caption -->
      <section class="typo-card">
        <div class="typo-card-head"><span class="tk">--text-sm · 19px / --fs-xs · 12px</span> Label / Caption</div>
        <div class="grid md:grid-cols-2 gap-x-8 gap-y-2">
          <div class="lbl">设置面板 Panel Settings</div>
          <div class="lbl">常规设置 General</div>
          <div class="cap">创建时间 Created 2026-08-31 12:00:00</div>
          <div class="cap">端口 Ports 8080, 8443 · IP 192.168.1.10</div>
        </div>
      </section>

      <!-- 5. Button / Badge / Status -->
      <section class="typo-card">
        <div class="typo-card-head"><span class="tk">--text-sm · 19px</span> Button / Badge / Status</div>
        <div class="flex flex-wrap items-center gap-3">
          <button class="btn-demo">✓ 保存设置</button>
          <button class="btn-demo ghost">创建容器</button>
          <button class="btn-demo danger">删除</button>
          <span class="badge-demo ok">运行中 Running</span>
          <span class="badge-demo warn">已停止 Stopped</span>
          <span class="badge-demo err">异常 Error</span>
          <span class="badge-demo info">v1.2.3</span>
        </div>
      </section>

      <!-- 6. Numbers / 数字 -->
      <section class="typo-card">
        <div class="typo-card-head"><span class="tk">--fs-hero 48 / --fs-5xl 34 / --fs-md 14px</span> Numbers / 统计数字(BlueCustard 数字艺术字)</div>
        <div class="num-hero">12 <span class="num-unit">Containers</span></div>
        <div class="flex flex-wrap gap-x-10 gap-y-2 items-baseline">
          <div class="num-big">45<span class="num-unit">%</span> <span class="num-cap">CPU</span></div>
          <div class="num-big">2.4<span class="num-unit">GB</span> <span class="num-cap">内存 Memory</span></div>
          <div class="num-big">512<span class="num-unit">MB</span> <span class="num-cap">已用</span></div>
          <div class="num-big">v1.2.3</div>
          <div class="num-small">25 images · 8 networks · 3 volumes · 0.5ms</div>
        </div>
      </section>

      <!-- 7. 中英文混排 -->
      <section class="typo-card">
        <div class="typo-card-head"><span class="tk">同一字号,中英文视觉高度一致</span> Mixed 中英文混排</div>
        <div class="mix-line">容器 Containers · 镜像 Images · 运行中 Running</div>
        <div class="mix-line">DockOrae 面板 v1.2.3-rc.1 已更新至 12.5.0</div>
        <div class="mix-line">CPU 使用率 CPU Usage · 内存使用率 Memory Usage</div>
        <div class="mix-line">重启面板 Restart Panel 后生效</div>
      </section>

      <!-- 8. 特殊字符覆盖(BlueCustard 缺失字形 → YuanQI 兜底) -->
      <section class="typo-card">
        <div class="typo-card-head"><span class="tk">% # @ & [ ] { } &lt; &gt; \ | ^ ~ — · 均来自 YuanQI</span> 特殊字符覆盖测试</div>
        <div class="mix-line">45% CPU · 颜色 #ec4899 · 用户 @admin · a[i] = {b} + &amp;c</div>
        <div class="mix-line">路径 C:\data\logs · 管道 a|b · 转义 ^x · 破折号 —— · 间隔号 a·b</div>
        <div class="mix-line">价格 ¥99 · €19 · £25 · 版权 © 2026 DockOrae</div>
      </section>

      <!-- 9. 等宽字体例外(终端/日志/代码,非艺术字体体系) -->
      <section class="typo-card">
        <div class="typo-card-head"><span class="tk">--font-mono(终端/日志/代码面板专用)</span> 等宽例外</div>
        <pre v-pre class="mono-demo">docker ps -a --format "table {{.Names}}\t{{.Status}}"</pre>
        <pre v-pre class="mono-demo">2026-08-31 12:00:01 [INFO] container nginx started (sha256:9f8e…)</pre>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const fontStatus = ref<Array<{ name: string; ok: boolean }>>([
  { name: 'BlueCustard', ok: false },
  { name: 'YuanQI', ok: false },
])
onMounted(async () => {
  try {
    await document.fonts.ready
    fontStatus.value[0].ok = document.fonts.check('19px BlueCustard')
    fontStatus.value[1].ok = document.fonts.check('19px YuanQI')
  } catch { /* ignore */ }
})
</script>

<style scoped>
.typo-page {
  min-height: 100vh;
  background: var(--dm-bg);
  color: var(--dm-text);
  padding: 32px 20px 60px;
  font-family: var(--font-art);
}
.typo-wrap {
  max-width: 860px;
  margin: 0 auto;
}
.typo-h1 {
  font-size: var(--fs-4xl);
  font-weight: 700;
  background: linear-gradient(135deg, var(--color-accent), #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
.typo-sub {
  font-size: var(--fs-md2);
  color: var(--dm-muted);
  margin-top: 4px;
}
.typo-sub code {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  background: var(--dm-surface2);
  padding: 1px 6px;
  border-radius: 6px;
  border: 1px solid var(--dm-line);
}
.font-status {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.font-status-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-sm);
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--dm-line);
  background: var(--dm-surface);
}
.font-status-item .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.font-status-item.ok .dot { background: #34d399; }
.font-status-item.fail .dot { background: #f87171; }
.font-status-item.ok { color: #34d399; }
.font-status-item.fail { color: #f87171; }

.typo-card {
  background: var(--dm-surface);
  border: 1px solid var(--dm-line);
  border-radius: 14px;
  padding: 18px 20px;
  margin-bottom: 16px;
}
.typo-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: var(--fs-sm2);
  font-weight: 600;
  color: var(--dm-muted);
  margin-bottom: 14px;
}
.typo-card-head .tk {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: 400;
  color: var(--color-brand);
  background: color-mix(in srgb, var(--color-brand) 10%, transparent);
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--color-brand) 35%, transparent);
}

.brand-display {
  font-size: var(--fs-hero);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0.5px;
  background: linear-gradient(135deg, var(--color-accent), #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
.brand-sub {
  font-size: var(--fs-3xl);
  color: var(--dm-text);
  margin-top: 6px;
}

.h-heading { font-size: var(--text-2xl); font-weight: 700; }
.h-title { font-size: var(--fs-2xl); font-weight: 600; }

.body-cn { font-size: var(--text-base); line-height: 1.6; }
.body-en { font-size: var(--text-base); line-height: 1.6; color: var(--dm-muted); }
.body-mix { font-size: var(--text-base); line-height: 1.6; color: var(--color-brand); }

.lbl { font-size: var(--text-sm); font-weight: 500; }
.cap { font-size: var(--fs-xs); color: var(--dm-muted); }

.btn-demo {
  font-size: var(--text-sm);
  font-weight: 500;
  padding: 9px 16px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  background: linear-gradient(135deg, #ec4899, #d946ef);
  color: #fff;
}
.btn-demo.ghost {
  background: var(--dm-surface2);
  color: var(--dm-text);
  border: 1px solid var(--dm-line);
}
.btn-demo.danger {
  background: rgba(248, 113, 113, 0.12);
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.3);
}
.badge-demo {
  font-size: var(--fs-sm);
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 999px;
}
.badge-demo.ok { background: rgba(52, 211, 153, 0.12); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.3); }
.badge-demo.warn { background: rgba(251, 191, 36, 0.12); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.3); }
.badge-demo.err { background: rgba(248, 113, 113, 0.12); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.3); }
.badge-demo.info { background: rgba(96, 165, 250, 0.12); color: #60a5fa; border: 1px solid rgba(96, 165, 250, 0.3); }

.num-hero {
  font-size: var(--fs-hero);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.num-unit { font-size: var(--fs-2xl); font-weight: 600; color: var(--dm-muted); margin-left: 4px; }
.num-big {
  font-size: var(--fs-5xl);
  font-weight: 600;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.num-cap { font-size: var(--fs-md); font-weight: 500; color: var(--dm-muted); }
.num-small { font-size: var(--fs-md); color: var(--dm-muted); }

.mix-line {
  font-size: var(--text-lg);
  line-height: 1.7;
  padding: 4px 0;
}
.mix-line + .mix-line { border-top: 1px dashed var(--dm-line); }

.mono-demo {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: #c9d2e3;
  background: #0a0d13;
  border: 1px solid #232a38;
  border-radius: 10px;
  padding: 10px 12px;
  margin: 6px 0;
  overflow-x: auto;
  white-space: pre;
}
</style>
