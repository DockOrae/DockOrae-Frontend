<template>
  <div class="files-page">
    <!-- Agent 离线:整页提示,禁止切换到容器内文件系统 -->
    <div v-if="agentOffline" class="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <div class="flex items-center justify-center w-14 h-14 rounded-2xl border border-line bg-surface2">
        <Icon name="server" size="26" class="text-muted" />
      </div>
      <div class="text-[15px] font-medium">{{ t('files.offline') }}</div>
      <div class="text-[12.5px] text-muted max-w-md">{{ t('files.offlineDesc') }}</div>
    </div>

    <template v-else>
      <!-- 目录 Tabs(1Panel 多目录页签) -->
      <div class="flex items-center gap-1 border-b border-line pb-1.5 mb-2 overflow-x-auto shrink-0">
        <div
          v-for="tab in tabs"
          :key="tab.id"
          class="flex items-center gap-1.5 px-3 h-8 rounded-lg text-[13px] cursor-pointer border border-transparent whitespace-nowrap"
          :class="tab.id === activeTabId ? 'bg-brand/10 text-brand border-brand/30' : 'text-muted hover:bg-surface2'"
          @click="changeTab(tab.id)"
        >
          <Icon name="folder" size="13" />
          <span class="max-w-[160px] truncate">{{ tab.name || t('files.root') }}</span>
          <button v-if="tabs.length > 1" class="w-4 h-4 rounded hover:bg-danger/20 hover:text-danger text-[13px] leading-none" @click.stop="removeTab(tab.id)">×</button>
        </div>
        <button
          v-if="tabs.length < 6"
          class="w-7 h-7 rounded-lg border border-line text-muted hover:text-text hover:border-[#3a4456] flex items-center justify-center shrink-0"
          :title="t('files.newTab')"
          @click="addTab"
        >
          <Icon name="plus" size="13" />
        </button>
      </div>

      <!-- 工具栏(1Panel:左侧 创建/上传/回收站/终端,右侧 批量操作) -->
      <div class="flex items-center gap-1.5 flex-wrap mb-2 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button size="sm" variant="brand">
              <Icon name="plus" size="13" /> {{ t('files.create') }} <Icon name="arrowDown" size="11" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" class="min-w-[120px]">
            <DropdownMenuItem @select="openCreate('dir')">
              <Icon name="folder" size="13" class="text-brand" /> {{ t('files.newFolder') }}
            </DropdownMenuItem>
            <DropdownMenuItem @select="openCreate('file')">
              <Icon name="fileText" size="13" class="text-muted" /> {{ t('files.newFile') }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" variant="ghost" @click="triggerUpload">
          <Icon name="upload" size="13" /> {{ t('files.upload') }}
        </Button>
        <span class="w-px h-4 bg-line mx-1" />
        <Button size="sm" variant="ghost" @click="openTrash">
          <Icon name="trash" size="13" /> {{ t('files.recycleBin') }}
        </Button>

        <!-- 右侧:粘贴(剪贴板模式)+ 批量操作 -->
        <div class="ml-auto flex items-center gap-1.5">
          <template v-if="moveOpen">
            <Button size="sm" variant="brand" class="!bg-brand/10 !text-brand !border-brand/30" @click="doPaste">
              <Icon name="copy" size="13" /> {{ t('files.paste') }}({{ moveItems.length }})
            </Button>
            <Button size="sm" variant="ghost" @click="closeMove"><Icon name="x" size="13" /></Button>
            <span class="w-px h-4 bg-line mx-1" />
          </template>
          <template v-if="selection.size > 0">
            <Button size="sm" variant="ghost" @click="openCopyMove('copy')">
              <Icon name="copy" size="13" /> {{ t('files.copy') }}
            </Button>
            <Button size="sm" variant="ghost" @click="openCopyMove('cut')">
              <Icon name="move" size="13" /> {{ t('files.move') }}
            </Button>
            <Button size="sm" variant="ghost" @click="openCompress">
              <Icon name="archive" size="13" /> {{ t('files.compress') }}
            </Button>
            <Button size="sm" variant="ghost" :disabled="selection.size !== 1" @click="openChmodSel">
              <Icon name="lock" size="13" /> {{ t('files.permission') }}
            </Button>
            <Button size="sm" variant="ghost" :disabled="selection.size !== 1" @click="openRename">
              <Icon name="edit" size="13" /> {{ t('files.rename') }}
            </Button>
            <Button size="sm" variant="ghost" :disabled="selection.size !== 1" @click="doExtract(singleSel)">
              <Icon name="archive" size="13" class="rotate-180" /> {{ t('files.extract') }}
            </Button>
            <Button size="sm" variant="ghost" class="!text-danger" @click="openDelete">
              <Icon name="trash" size="13" /> {{ t('files.delete') }}
            </Button>
            <span class="w-px h-4 bg-line mx-1" />
          </template>
          <span class="text-[12px] text-muted whitespace-nowrap">
            {{ t('files.selectedCount', { n: selection.size }) }}
          </span>
          <button v-if="selection.size > 0" type="button" class="text-[12px] text-brand hover:underline" @click="clearSelection">
            {{ t('common.cancel') }}
          </button>
        </div>
      </div>

      <!-- 上传进度 -->
      <div v-if="uploading" class="flex items-center gap-2 flex-1 max-w-sm mb-2">
        <div class="flex-1 h-1.5 rounded-full bg-surface2 overflow-hidden">
          <div class="h-full bg-brand transition-all" :style="{ width: uploadPct + '%' }" />
        </div>
        <span class="shrink-0">{{ t('files.uploading', { pct: uploadPct }) }}</span>
      </div>


      <!-- 导航区(1Panel:返回/前进/上级/刷新/隐藏文件 + 面包屑 + 搜索) -->
      <div class="flex flex-wrap items-center gap-2 pb-2 shrink-0">
        <div class="flex items-center gap-1 shrink-0">
          <Button variant="icon" :disabled="pointer <= 0" :title="t('files.historyBack')" @click="back">
            <Icon name="arrowRight" size="14" class="rotate-180" />
          </Button>
          <Button variant="icon" :disabled="pointer >= history.length - 1" :title="t('files.historyForward')" @click="forward">
            <Icon name="arrowRight" size="14" />
          </Button>
          <Button variant="icon" :disabled="paths.length === 0" :title="t('files.top')" @click="top">
            <Icon name="arrowUp" size="14" />
          </Button>
          <Button variant="icon" :title="t('files.refresh')" @click="reload">
            <Icon name="refresh" size="14" />
          </Button>
          <Button variant="icon" :title="t('files.showHidden')" @click="toggleHidden">
            <Icon name="eye" size="14" :class="showHidden ? 'text-brand' : ''" />
          </Button>
        </div>

        <!-- 面包屑:点击进入输入模式(1Panel address-bar) -->
        <div
          v-if="!editingPath"
          class="flex-1 min-w-0 flex items-center gap-0.5 text-[13px] h-8 px-2 rounded-lg border border-transparent hover:border-line cursor-text"
          @click="startEditPath"
        >
          <span class="breadcrumb-root shrink-0"><Icon name="home" size="16" class="text-muted" /></span>
          <template v-for="(p, i) in visiblePaths" :key="'bp' + i">
            <span class="arrow text-muted shrink-0">/</span>
            <span v-if="i === 1 && hiddenPaths.length > 0" class="relative shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <button type="button" class="path-segment px-1 hover:text-brand" @click.stop>⋯</button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem v-for="hp in hiddenPaths" :key="hp.url" @select="jump(hp.url)">
                    <span class="max-w-[220px] truncate">{{ hp.name }}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
            <button
              v-else
              type="button"
              class="path-segment truncate px-1 rounded hover:text-brand"
              :class="i === visiblePaths.length - 1 ? 'text-text font-medium' : 'text-muted'"
              @click="jump(p.url)"
            >
              {{ p.name }}
            </button>
          </template>
        </div>
        <Input v-else v-model="editPathValue" class="flex-1 !h-8 !text-xs min-w-[200px]" autofocus @keyup.enter="confirmEditPath" @blur="editingPath = false" />

        <!-- 搜索(含"包含子目录") -->
        <div class="flex items-center gap-2 shrink-0">
          <div class="relative">
            <Icon name="search" size="13" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              v-model="search"
              class="!w-56 !h-8 !pl-8 !pr-16 !text-xs"
              :placeholder="t('files.searchPh')"
              @keyup.enter="doSearch"
            />
            <label class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-muted cursor-pointer select-none">
              <input v-model="containSub" type="checkbox" class="w-3 h-3 accent-[var(--color-brand)]" />
              {{ t('files.containSub') }}
            </label>
          </div>
        </div>
      </div>

      <!-- 文件列表(全屏平铺) -->
      <div class="file-list flex flex-col flex-1 border border-line rounded-xl bg-surface overflow-hidden min-h-[420px]">
        <div class="list-head grid grid-cols-[minmax(0,1fr)_76px_150px_110px_150px_80px_150px] gap-2 px-3 h-10 items-center text-[13px] text-muted uppercase tracking-wide border-b border-line bg-surface2">
          <div class="flex items-center gap-2 min-w-0">
            <span
              class="w-4 h-4 rounded-[5px] border flex items-center justify-center shrink-0 cursor-pointer"
              :class="allSelected === true ? 'bg-brand border-brand' : allSelected === 'indeterminate' ? 'bg-brand/40 border-brand' : 'border-line hover:border-[#3a4456]'"
              :title="t('files.selectAll')"
              @click.stop="toggleAll"
            >
              <Icon v-if="allSelected === true" name="check" size="10" class="text-white" />
              <span v-else-if="allSelected === 'indeterminate'" class="w-2 h-0.5 rounded bg-white" />
            </span>
            <button type="button" class="flex items-center gap-1 text-left" @click="onSortKey('name')">
              {{ t('files.colName') }} <Icon v-if="sortKey === 'name'" :name="sortDir === 'asc' ? 'arrowUp' : 'arrowDown'" size="10" />
            </button>
          </div>
          <button type="button" class="flex items-center gap-1 text-left" @click="onSortKey('mode')">
            {{ t('files.colPermission') }} <Icon v-if="sortKey === 'mode'" :name="sortDir === 'asc' ? 'arrowUp' : 'arrowDown'" size="10" />
          </button>
          <span class="hidden md:block truncate">{{ t('files.colOwnerGroup') }}</span>
          <button type="button" class="flex items-center gap-1 text-left" @click="onSortKey('size')">
            {{ t('files.colSize') }} <Icon v-if="sortKey === 'size'" :name="sortDir === 'asc' ? 'arrowUp' : 'arrowDown'" size="10" />
          </button>
          <button type="button" class="hidden sm:flex items-center gap-1 text-left" @click="onSortKey('mtime')">
            {{ t('files.colModified') }} <Icon v-if="sortKey === 'mtime'" :name="sortDir === 'asc' ? 'arrowUp' : 'arrowDown'" size="10" />
          </button>
          <span class="hidden lg:block">{{ t('files.colRemark') }}</span>
          <span class="text-right mr-[56px]">{{ t('files.colActions') }}</span>
        </div>

            <div class="list-body flex-1 overflow-y-auto" @contextmenu.prevent="onListContext" @click="onListClick" @dragover.prevent @drop.prevent="onDrop">
              <div v-if="loading" class="p-10 text-center text-muted text-[13px] flex items-center justify-center gap-2">
                <Icon name="refresh" size="14" class="spin" /> {{ t('files.loading') }}
              </div>
              <div v-else-if="loadError" class="p-10 text-center text-danger text-[13px]">
                {{ loadError }}
              </div>
              <div v-else-if="filtered.length === 0" class="p-10 text-center text-muted text-[13px]">
                {{ search ? t('files.searchEmpty') : t('files.empty') }}
              </div>
              <div
                v-for="e in filtered"
                :key="e.path"
                class="list-row group grid grid-cols-[minmax(0,1fr)_76px_150px_110px_150px_80px_150px] gap-2 px-3 h-10 items-center text-[13px] cursor-default select-none"
                :class="{ selected: isSelected(e) }"
                @click="onRowClick(e, $event)"
                @dblclick="open(e)"
                @contextmenu.prevent="onRowContext(e, $event)"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span
                    class="w-4 h-4 rounded-[5px] border flex items-center justify-center shrink-0"
                    :class="isSelected(e) ? 'bg-brand border-brand' : 'border-line'"
                  >
                    <Icon v-if="isSelected(e)" name="check" size="10" class="text-white" />
                  </span>
                  <Icon :name="iconFor(e)" size="16" :class="iconColor(e)" class="shrink-0" />
                  <span class="truncate">{{ e.name }}</span>
                  <span v-if="e.type === 'symlink' && e.target" class="truncate text-muted text-[11.5px]">→ {{ e.target }}</span>
                </div>
                <button type="button" class="font-mono text-[12px] text-muted hover:text-brand text-left" :title="t('files.permission')" @click.stop="openChmod(e)">
                  {{ permOctal(e) }}
                </button>
                <span class="hidden md:block text-muted text-[12px] truncate">{{ e.owner || '—' }} / {{ e.group || '—' }}</span>
                <button
                  v-if="e.type === 'directory'"
                  type="button"
                  class="text-[12px] text-brand/80 hover:text-brand text-left"
                  :class="{ 'opacity-50 pointer-events-none': dirSizing.has(e.path) }"
                  @click.stop="calcDirSize(e)"
                >
                  {{ dirSizing.has(e.path) ? t('files.calculating') : dirSizeMap.has(e.path) ? formatBytes(dirSizeMap.get(e.path)!) : t('files.calculate') }}
                </button>
                <span v-else class="text-muted text-[12px]">{{ formatBytes(e.size) }}</span>
                <span class="hidden sm:block text-muted text-[12px]">{{ formatTime(e.modified_at) }}</span>
                <span class="hidden lg:block text-muted text-[12px]">—</span>
                <span class="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
                  <Button v-if="e.type === 'directory'" size="sm" variant="ghost" class="px-1.5" @click="go(e.path)">{{ t('files.actOpen') }}</Button>
                  <Button v-else size="sm" variant="ghost" class="px-1.5" @click="open(e)">{{ t('files.actOpen') }}</Button>
                  <Button size="sm" variant="ghost" class="px-1.5" @click="download(e)">{{ t('files.actDownload') }}</Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button size="sm" variant="ghost" class="px-1">⋯</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="min-w-[150px]">
                      <DropdownMenuItem @select="openRenameFor(e)">{{ t('files.rename') }}</DropdownMenuItem>
                      <DropdownMenuItem @select="openCopyMoveFor(e, 'copy')">{{ t('files.copy') }}</DropdownMenuItem>
                      <DropdownMenuItem @select="openCopyMoveFor(e, 'cut')">{{ t('files.move') }}</DropdownMenuItem>
                      <DropdownMenuItem v-if="e.type !== 'directory'" @select="openEdit(e)">{{ t('files.edit') }}</DropdownMenuItem>
                      <DropdownMenuItem v-if="e.type === 'directory'" @select="openCompressFor(e)">{{ t('files.compress') }}</DropdownMenuItem>
                      <DropdownMenuItem v-if="isArchive(e)" @select="doExtract(e)">{{ t('files.extract') }}</DropdownMenuItem>
                      <DropdownMenuItem @select="openProps(e)">{{ t('files.props') }}</DropdownMenuItem>
                      <DropdownMenuItem @select="openChmod(e)">{{ t('files.permission') }}</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem @select="openTerminalHere(e)">{{ t('files.terminalHere') }}</DropdownMenuItem>
                      <DropdownMenuItem class="!text-danger" @select="openDeleteFor(e)">{{ t('files.delete') }}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </span>
              </div>
            </div>
          </div>

      <!-- 底部统计(1Panel:目录/文件数量 + 当前目录大小) -->
      <div class="flex items-center gap-3 text-[12px] text-muted mt-2 shrink-0">
        <span>{{ t('files.dirFileNum', { dir: dirNum, file: fileNum }) }}</span>
        <span class="flex items-center gap-1">
          {{ t('files.currentDirSize') }}
          <button
            v-if="dirTotalSize === -1"
            type="button"
            class="text-brand/80 hover:text-brand"
            :disabled="calcDirTotal"
            @click="calcDirTotalSize"
          >
            {{ calcDirTotal ? t('files.calculating') : t('files.calculate') }}
          </button>
          <span v-else>{{ formatBytes(dirTotalSize) }}</span>
        </span>
      </div>
    </template>

    <!-- 右键菜单 -->
    <FileContextMenu :visible="ctx.visible" :x="ctx.x" :y="ctx.y" :items="ctxItems" @action="onCtxAction" @close="ctx.visible = false" />

    <!-- 新建文件/文件夹 -->
    <Modal :model-value="create.open" :title="create.kind === 'file' ? t('files.newFile') : t('files.newFolder')" @close="create.open = false" @update:model-value="(v) => (create.open = v)">
      <div class="space-y-3">
        <Input
          v-model="create.name"
          :placeholder="create.kind === 'file' ? t('files.newFilePh') : t('files.newFolderPh')"
          @keyup.enter="doCreate"
        />
        <div class="flex justify-end gap-2">
          <Button size="sm" variant="ghost" @click="create.open = false">{{ t('common.cancel') }}</Button>
          <Button size="sm" variant="brand" :loading="create.busy" @click="doCreate">{{ t('files.create') }}</Button>
        </div>
      </div>
    </Modal>

    <!-- 重命名 -->
    <Modal :model-value="rename.open" :title="t('files.renameTitle')" @close="rename.open = false" @update:model-value="(v) => (rename.open = v)">
      <div class="space-y-3">
        <Input v-model="rename.name" :placeholder="t('files.renameName')" @keyup.enter="doRename" />
        <div class="flex justify-end gap-2">
          <Button size="sm" variant="ghost" @click="rename.open = false">{{ t('common.cancel') }}</Button>
          <Button size="sm" variant="brand" :loading="rename.busy" @click="doRename">{{ t('common.ok') }}</Button>
        </div>
      </div>
    </Modal>

    <!-- 压缩 -->
    <Modal :model-value="compress.open" :title="t('files.compressTitle')" @close="compress.open = false" @update:model-value="(v) => (compress.open = v)">
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <Select v-model="compress.format">
            <SelectTrigger class="!w-36 !h-8 !text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tar.gz">tar.gz</SelectItem>
              <SelectItem value="zip">zip</SelectItem>
            </SelectContent>
          </Select>
          <Input v-model="compress.name" class="!h-8 !text-xs" @keyup.enter="doCompress" />
        </div>
        <div class="text-[12px] text-muted break-all">
          {{ t('files.compressTarget') }}: <span>{{ compressNames }}</span>
        </div>
        <div class="flex justify-end gap-2">
          <Button size="sm" variant="ghost" @click="compress.open = false">{{ t('common.cancel') }}</Button>
          <Button size="sm" variant="brand" :loading="compress.busy" @click="doCompress">{{ t('common.ok') }}</Button>
        </div>
      </div>
    </Modal>

    <!-- 删除确认(回收站开启:移入回收站 + 强制删除选项;关闭:永久删除警告) -->
    <Modal :model-value="del.open" :title="t('files.deleteTitle')" @close="del.open = false" @update:model-value="(v) => (del.open = v)">
      <div class="space-y-3">
        <div
          class="rounded-lg border px-3 py-2.5 text-[13px] flex items-start gap-2"
          :class="trashEnabled ? 'border-line bg-surface2 text-muted' : 'border-danger/40 bg-danger/10 text-danger'"
        >
          <Icon :name="trashEnabled ? 'info' : 'alert'" size="14" class="mt-0.5 shrink-0" />
          <div>
            <div>{{ trashEnabled ? t('files.deleteToTrash') : t('files.deletePermanent') }}</div>
            <div v-if="hasDirSel" class="mt-1 text-[12px] opacity-80">{{ t('files.deleteRecursive') }}</div>
          </div>
        </div>
        <label v-if="trashEnabled" class="flex items-center gap-2 text-[13px] cursor-pointer select-none">
          <input v-model="del.force" type="checkbox" class="w-4 h-4 accent-[var(--color-brand)]" />
          {{ t('files.forceDelete') }}
        </label>
        <div class="max-h-44 overflow-y-auto border border-line rounded-lg divide-y divide-line">
          <div v-for="e in del.items" :key="e.path" class="px-3 py-2 text-[12.5px] break-all">
            {{ e.path }}
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <Button size="sm" variant="ghost" @click="del.open = false">{{ t('common.cancel') }}</Button>
          <Button size="sm" variant="destructive" :loading="del.busy" @click="doDelete">{{ t('files.deleteConfirmBtn') }}</Button>
        </div>
      </div>
    </Modal>

    <!-- 回收站 -->
    <Modal :model-value="trashOpen" :title="t('files.recycleBin')" size="2xl" @close="trashOpen = false" @update:model-value="(v) => (trashOpen = v)">
      <div class="space-y-3">
        <div class="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="brand" :disabled="trashSel.size === 0" @click="doTrashRestore">
            <Icon name="refresh" size="13" /> {{ t('files.trashRestore') }}
          </Button>
          <Button size="sm" variant="destructive" :disabled="trashSel.size === 0" @click="doTrashDelete">
            <Icon name="trash" size="13" /> {{ t('files.trashDelete') }}
          </Button>
          <Button size="sm" variant="ghost" :disabled="trashItems.length === 0" @click="doTrashEmpty">
            <Icon name="trash" size="13" /> {{ t('files.trashEmpty') }}
          </Button>
          <div class="ml-auto flex items-center gap-2 text-[13px]">
            <span class="text-muted">{{ t('files.trashEnabled') }}</span>
            <Switch :model-value="trashEnabled" @update:model-value="toggleTrash" />
          </div>
        </div>
        <div class="text-[12px] text-muted">
          {{ t('files.trashDir') }}: <span class="font-mono">{{ trashDir }}</span>
        </div>
        <div v-if="trashItems.length === 0" class="py-10 text-center text-muted text-[13px]">
          {{ t('files.trashEmptyHint') }}
        </div>
        <div v-else class="max-h-[46vh] overflow-y-auto border border-line rounded-lg">
          <div class="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_80px_150px_36px] gap-2 px-3 h-9 items-center text-[11px] text-muted uppercase tracking-wide border-b border-line bg-surface2">
            <span>{{ t('files.colName') }}</span>
            <span class="truncate">{{ t('files.trashSource') }}</span>
            <span>{{ t('files.colSize') }}</span>
            <span>{{ t('files.trashDeleteTime') }}</span>
            <span />
          </div>
          <div
            v-for="it in trashItems"
            :key="it.name"
            class="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_80px_150px_36px] gap-2 px-3 h-10 items-center text-[13px] hover:bg-surface2 cursor-pointer"
            :class="{ 'bg-brand/10': trashSel.has(it.name) }"
            @click="toggleTrashSel(it.name)"
          >
            <span class="flex items-center gap-2 min-w-0 truncate">
              <Icon :name="it.is_dir ? 'folder' : 'fileText'" size="14" :class="it.is_dir ? 'text-brand' : 'text-muted'" class="shrink-0" />
              <span class="truncate">{{ it.name }}</span>
            </span>
            <span class="truncate text-muted text-[12px] break-all">{{ it.source_path }}</span>
            <span class="text-muted text-[12px]">{{ it.is_dir ? t('files.sizeDir') : formatBytes(it.size) }}</span>
            <span class="text-muted text-[12px]">{{ formatTime(it.delete_time) }}</span>
            <span class="flex items-center justify-center">
              <span class="w-4 h-4 rounded-[5px] border flex items-center justify-center" :class="trashSel.has(it.name) ? 'bg-brand border-brand' : 'border-line'">
                <Icon v-if="trashSel.has(it.name)" name="check" size="10" class="text-white" />
              </span>
            </span>
          </div>
        </div>
      </div>
    </Modal>

    <!-- 递归搜索 -->
    <Modal :model-value="deepSearchOpen" :title="t('files.searchRoot')" size="xl" @close="deepSearchOpen = false" @update:model-value="(v) => (deepSearchOpen = v)">
      <div class="space-y-3">
        <div class="relative">
          <Icon name="search" size="13" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            v-model="deepQuery"
            class="!pl-8"
            :placeholder="t('files.deepSearchPh')"
            @keyup.enter="doDeepSearch"
          />
        </div>
        <div v-if="deepLoading" class="py-6 text-center text-muted text-[13px]">{{ t('files.loading') }}</div>
        <div v-else-if="deepResults.length > 0" class="max-h-[46vh] overflow-y-auto border border-line rounded-lg divide-y divide-line">
          <div v-if="deepTruncated" class="px-3 py-2 text-[12px] text-muted">{{ t('files.searchTruncated', { n: deepResults.length }) }}</div>
          <button
            v-for="r in deepResults"
            :key="r.path"
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left hover:bg-surface2"
            @click="goToResult(r)"
          >
            <Icon :name="r.type === 'directory' ? 'folder' : 'fileText'" size="14" :class="r.type === 'directory' ? 'text-brand' : 'text-muted'" class="shrink-0" />
            <span class="truncate">{{ r.path }}</span>
            <span class="ml-auto shrink-0 text-[11.5px] text-muted">{{ r.type === 'directory' ? '—' : formatBytes(r.size) }}</span>
          </button>
        </div>
        <div v-else-if="!deepLoading" class="py-6 text-center text-muted text-[13px]">{{ t('files.searchEmpty') }}</div>
      </div>
    </Modal>

    <!-- 图片预览 -->
    <Modal :model-value="previewPath !== null" :title="previewName" size="2xl" @close="previewPath = null" @update:model-value="(v) => !v && (previewPath = null)">
      <div class="flex items-center justify-center min-h-[200px]">
        <img v-if="previewPath" :src="filePreviewUrl(previewPath)" class="max-w-full max-h-[60vh] rounded-lg object-contain" alt="preview" />
      </div>
    </Modal>

    <!-- 编辑器 / 属性 -->
    <FileEditorDialog :open="editorPath !== null" :path="editorPath || ''" @close="editorPath = null" @saved="reload" />
    <FilePropsDialog :open="propsTarget !== null" :entry="propsTarget" @close="propsTarget = null" @saved="reload" />

    <!-- 在此打开终端(二级弹框,不跳转侧边栏终端页) -->
    <FileTerminalDialog :open="terminalHere.open" :cwd="terminalHere.cwd" @close="terminalHere.open = false" />

    <input ref="fileInput" type="file" multiple class="hidden" @change="onFilesSelected" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import Modal from '../components/Modal.vue'
import FileContextMenu, { type CtxMenuItem } from '../components/files/FileContextMenu.vue'
import FileEditorDialog from '../components/files/FileEditorDialog.vue'
import FilePropsDialog from '../components/files/FilePropsDialog.vue'
import FileTerminalDialog from '../components/files/FileTerminalDialog.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  listFiles, touchFile, mkdirFile, renameFile, copyFile, moveFile, removeFiles,
  compressFiles, extractFile, searchFiles, uploadFile, fileDownloadUrl, filePreviewUrl,
  trashStatus, trashSetEnabled, trashList, trashRestore, trashDelete, trashEmpty,
  dirSize,
} from '../api/files'
import type { HostFile, TrashItem } from '../types'
import { formatBytes } from '../util'
import { toastErr, toastOk } from '../toast'
import { useConfirm } from '../confirm'
import type { IconName } from '../icons'

const { t } = useI18n()
const router = useRouter()
const confirm = useConfirm()

const cwd = ref('/')
const entries = ref<HostFile[]>([])
const loading = ref(false)
const loadError = ref('')
const agentOffline = ref(false)
const search = ref('')
const containSub = ref(false)
const sortKey = ref<'name' | 'mode' | 'size' | 'mtime'>('name')
const sortDir = ref<'asc' | 'desc'>('asc')
const selection = reactive(new Set<string>())
const anchorIdx = ref(-1)
const uploadPct = ref(0)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// 目录 Tabs(1Panel 多目录页签)
interface FileTab { id: string; name: string; path: string }
const tabs = ref<FileTab[]>([{ id: '1', name: '', path: '/' }])
const activeTabId = ref('1')
// 导航历史(1Panel history + pointer)
const history = ref<string[]>([])
const pointer = ref(-1)
// 面包屑路径段(1Panel paths)
interface PathSeg { url: string; name: string }
const paths = ref<PathSeg[]>([])
const visiblePaths = ref<PathSeg[]>([])
const hiddenPaths = ref<PathSeg[]>([])
const editingPath = ref(false)
const editPathValue = ref('')
const showHidden = ref(false)
// 剪贴板模式(1Panel moveOpen:复制/剪切 → 粘贴)
const moveOpen = ref(false)
const moveMode = ref<'copy' | 'cut'>('copy')
const moveItems = ref<HostFile[]>([])
// 目录大小
const dirSizeMap = reactive(new Map<string, number>())
const dirSizing = reactive(new Set<string>())
const dirTotalSize = ref(-1)
const calcDirTotal = ref(false)

const ctx = reactive({ visible: false, x: 0, y: 0, entry: null as HostFile | null })
const create = reactive({ open: false, kind: 'file' as 'file' | 'dir', name: '', busy: false })
const rename = reactive({ open: false, name: '', busy: false })
const compress = reactive({ open: false, format: 'tar.gz' as 'tar.gz' | 'zip', name: '', busy: false })
// 删除确认(回收站感知)
const del = reactive({ open: false, items: [] as HostFile[], force: false, busy: false })
// 回收站
const trashOpen = ref(false)
const trashEnabled = ref(true)
const trashDir = ref('')
const trashItems = ref<TrashItem[]>([])
const trashSel = reactive(new Set<string>())
const deepSearchOpen = ref(false)
const deepQuery = ref('')
const deepLoading = ref(false)
const deepResults = ref<Array<{ path: string; name: string; type: string; size: number }>>([])
const deepTruncated = ref(false)
const editorPath = ref<string | null>(null)
const propsTarget = ref<HostFile | null>(null)
const previewPath = ref<string | null>(null)
const previewName = computed(() => previewPath.value?.split(/[\\/]/).filter(Boolean).pop() || '')
// 在此打开终端(弹窗,不跳转侧边栏终端页)
const terminalHere = reactive({ open: false, cwd: '/root' })

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'])
const ARCHIVE_EXT = new Set(['tar.gz', 'tgz', 'tar', 'zip', '7z', 'rar', 'xz', 'gz', 'bz2'])
const TEXT_EXT = new Set([
  'txt', 'json', 'yaml', 'yml', 'toml', 'ini', 'conf', 'sh', 'service', 'env', 'md',
  'ts', 'tsx', 'vue', 'css', 'html', 'go', 'js', 'jsx', 'py', 'log', 'xml', 'yml', 'properties', 'dockerfile',
])

function isImage(e: HostFile): boolean {
  return IMAGE_EXT.has(extOf(e.name))
}
function isArchive(e: HostFile): boolean {
  const n = e.name.toLowerCase()
  return ARCHIVE_EXT.has(extOf(e.name)) || n.endsWith('.tar.gz')
}
function extOf(name: string): string {
  const n = name.toLowerCase()
  if (n.endsWith('.tar.gz')) return 'tar.gz'
  return n.split('.').pop() || ''
}
function isTextFile(e: HostFile): boolean {
  return e.type === 'file' && TEXT_EXT.has(extOf(e.name))
}

// ---------- 路径工具(兼容 POSIX 与 Windows 本地测试) ----------
const SEP = computed(() => (/^[A-Za-z]:/.test(cwd.value) ? '\\' : '/'))
const rootSeg = computed(() => (/^[A-Za-z]:/.test(cwd.value) ? cwd.value.slice(0, 2) : '/'))
function joinPath(dir: string, name: string): string {
  return dir.endsWith('/') || dir.endsWith('\\') ? dir + name : dir + SEP.value + name
}

// buildPaths 把路径拆成面包屑段(1Panel paths)
function buildPaths(p: string): PathSeg[] {
  const parts = p.split(/[\\/]+/).filter(Boolean)
  const segs: PathSeg[] = []
  if (/^[A-Za-z]:$/.test(parts[0] || '')) {
    segs.push({ url: parts[0] + '\\', name: parts[0] })
    let acc = parts[0]
    for (let i = 1; i < parts.length; i++) {
      acc += '\\' + parts[i]
      segs.push({ url: acc, name: parts[i] })
    }
    return segs
  }
  let acc = ''
  for (const part of parts) {
    acc += '/' + part
    segs.push({ url: acc, name: part })
  }
  return segs
}
function refreshVisiblePaths() {
  visiblePaths.value = [...paths.value]
  hiddenPaths.value = []
  // 溢出折叠(简化:超过 5 段折叠中间)
  if (paths.value.length > 5) {
    hiddenPaths.value = paths.value.slice(1, paths.value.length - 3)
    visiblePaths.value = [paths.value[0], ...paths.value.slice(paths.value.length - 3)]
  }
}

// ---------- 导航(1Panel jump/back/right/top) ----------
async function jump(url: string) {
  if (url === cwd.value) return
  // 入历史栈
  history.value.splice(pointer.value + 1)
  history.value.push(url)
  pointer.value = history.value.length - 1
  cwd.value = url
  paths.value = buildPaths(url)
  refreshVisiblePaths()
  updateTabName()
  await load(url)
}
function back() {
  if (pointer.value > 0) {
    pointer.value--
    const url = history.value[pointer.value]
    cwd.value = url
    paths.value = buildPaths(url)
    refreshVisiblePaths()
    updateTabName()
    load(url)
  }
}
function forward() {
  if (pointer.value < history.value.length - 1) {
    pointer.value++
    const url = history.value[pointer.value]
    cwd.value = url
    paths.value = buildPaths(url)
    refreshVisiblePaths()
    updateTabName()
    load(url)
  }
}
function top() {
  if (paths.value.length > 0) {
    const url = paths.value.length >= 2 ? paths.value[paths.value.length - 2].url : rootSeg.value
    jump(url)
  }
}
function go(p: string) {
  jump(p)
}
function startEditPath() {
  editPathValue.value = cwd.value
  editingPath.value = true
}
function confirmEditPath() {
  const v = editPathValue.value.trim()
  editingPath.value = false
  if (v && v !== cwd.value) jump(v)
}
function toggleHidden() {
  showHidden.value = !showHidden.value
  reload()
}
// 在此打开终端:弹窗进入对应目录(目录=本身,文件=所在目录)
function openTerminalHere(e: HostFile) {
  if (e.type === 'directory') {
    terminalHere.cwd = e.path
  } else {
    const idx = e.path.lastIndexOf('/')
    const idx2 = e.path.lastIndexOf('\\')
    const cut = Math.max(idx, idx2)
    terminalHere.cwd = cut > 0 ? e.path.slice(0, cut) : '/'
  }
  terminalHere.open = true
}

// ---------- Tabs(1Panel 多目录页签) ----------
function updateTabName() {
  const tab = tabs.value.find((t) => t.id === activeTabId.value)
  if (tab) {
    const segs = buildPaths(cwd.value)
    tab.name = segs.length ? segs[segs.length - 1].name : ''
  }
}
function changeTab(id: string) {
  if (id === activeTabId.value) return
  const tab = tabs.value.find((t) => t.id === id)
  if (!tab) return
  activeTabId.value = id
  if (tab.path && tab.path !== cwd.value) {
    cwd.value = tab.path
    paths.value = buildPaths(tab.path)
    refreshVisiblePaths()
    load(tab.path)
  }
}
function addTab() {
  if (tabs.value.length >= 6) return
  const usedIds = new Set(tabs.value.map((t) => Number(t.id)))
  const newId = String(Array.from({ length: 6 }, (_, i) => i + 1).find((id) => !usedIds.has(id)) || tabs.value.length + 1)
  const segs = buildPaths(cwd.value)
  tabs.value.push({ id: newId, name: segs.length ? segs[segs.length - 1].name : '', path: cwd.value })
  activeTabId.value = newId
}
function removeTab(id: string) {
  if (tabs.value.length <= 1) return
  const idx = tabs.value.findIndex((t) => t.id === id)
  if (idx === -1) return
  let next = activeTabId.value
  if (activeTabId.value === id) {
    next = tabs.value[idx + 1]?.id ?? tabs.value[idx - 1].id
  }
  tabs.value = tabs.value.filter((t) => t.id !== id)
  activeTabId.value = next
  changeTab(next)
}

// ---------- 剪贴板模式(1Panel 复制/剪切 → 粘贴) ----------
function openCopyMove(mode: 'copy' | 'cut') {
  const items = selectedEntries.value
  if (items.length === 0) return
  moveMode.value = mode
  moveItems.value = items
  moveOpen.value = true
}
function openCopyMoveFor(e: HostFile, mode: 'copy' | 'cut') {
  moveMode.value = mode
  moveItems.value = [e]
  moveOpen.value = true
}
function closeMove() {
  moveOpen.value = false
  moveItems.value = []
}
async function doPaste() {
  if (moveItems.value.length === 0) return
  const dest = cwd.value
  const mode = moveMode.value
  const items = moveItems.value
  moveOpen.value = false
  try {
    if (mode === 'copy') {
      for (const it of items) {
        await copyFile(it.path, joinPath(dest, it.name))
      }
      toastOk(t('files.copied'))
    } else {
      for (const it of items) {
        await moveFile(it.path, joinPath(dest, it.name))
      }
      toastOk(t('files.moved'))
    }
    moveItems.value = []
    clearSelection()
    reload()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : t('files.errActionFailed'))
  }
}

// ---------- 目录大小(1Panel 计算) ----------
async function calcDirSize(e: HostFile) {
  if (dirSizing.has(e.path)) return
  dirSizing.add(e.path)
  try {
    const res = await dirSize(e.path)
    dirSizeMap.set(e.path, res.size)
  } catch {
    /* 忽略:保持"计算"状态 */
  } finally {
    dirSizing.delete(e.path)
  }
}
async function calcDirTotalSize() {
  if (calcDirTotal.value) return
  calcDirTotal.value = true
  try {
    const res = await dirSize(cwd.value)
    dirTotalSize.value = res.size
  } catch {
    toastErr(t('files.errActionFailed'))
  } finally {
    calcDirTotal.value = false
  }
}

// ---------- 统计 ----------
const dirNum = computed(() => entries.value.filter((e) => e.type === 'directory').length)
const fileNum = computed(() => entries.value.filter((e) => e.type !== 'directory').length)

// ---------- 加载 ----------
async function load(p?: string) {
  if (p !== undefined) cwd.value = p
  loading.value = true
  loadError.value = ''
  try {
    const res = await listFiles(cwd.value, showHidden.value)
    entries.value = res.entries
    agentOffline.value = false
    dirTotalSize.value = -1
    dirSizeMap.clear()
    if (history.value.length === 0) {
      history.value.push(cwd.value)
      pointer.value = 0
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('AGENT_UNAVAILABLE') || msg.includes('Agent 不可用') || msg.includes('Agent unavailable')) {
      agentOffline.value = true
    } else {
      loadError.value = msg
    }
    entries.value = []
  } finally {
    loading.value = false
  }
}
function reload() {
  load(cwd.value)
}
onMounted(() => load('/'))
watch(cwd, () => clearSelection())

// ---------- 排序 / 筛选 ----------
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  let list = entries.value
  if (q) list = list.filter((e) => e.name.toLowerCase().includes(q))
  const dirFirst = (a: HostFile, b: HostFile) => Number(b.type === 'directory') - Number(a.type === 'directory')
  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    const d = dirFirst(a, b)
    if (d !== 0) return d
    let r = 0
    if (key === 'name') r = a.name.localeCompare(b.name)
    else if (key === 'mode') r = a.mode - b.mode
    else if (key === 'size') r = a.size - b.size
    else r = a.modified_at.localeCompare(b.modified_at)
    return r * dir
  })
})
function onSortKey(k: unknown) {
  const v = String(k ?? 'name') as 'name' | 'mode' | 'size' | 'mtime'
  if (sortKey.value === v) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else {
    sortKey.value = v
    sortDir.value = 'asc'
  }
}

// 搜索(1Panel:回车触发;勾选"包含子目录"时递归搜索)
function doSearch() {
  if (containSub.value) {
    deepQuery.value = search.value.trim()
    if (!deepQuery.value) return
    deepSearchOpen.value = true
    doDeepSearch()
  }
}

// ---------- 多选 ----------
function isSelected(e: HostFile): boolean {
  return selection.has(e.name)
}
// 全选状态:true=全选 / 'indeterminate'=部分 / false=未选
const allSelected = computed<boolean | 'indeterminate'>(() => {
  const names = filtered.value.map((e) => e.name)
  if (names.length === 0) return false
  const sel = names.filter((n) => selection.has(n)).length
  if (sel === 0) return false
  if (sel === names.length) return true
  return 'indeterminate'
})
function toggleAll() {
  const names = filtered.value.map((e) => e.name)
  const all = names.every((n) => selection.has(n))
  if (all) names.forEach((n) => selection.delete(n))
  else names.forEach((n) => selection.add(n))
  anchorIdx.value = -1
}
function clearSelection() {
  selection.clear()
  anchorIdx.value = -1
}
function onRowClick(e: HostFile, ev: MouseEvent) {
  ev.stopPropagation()
  const idx = filtered.value.findIndex((x) => x.path === e.path)
  if (ev.shiftKey && anchorIdx.value >= 0 && idx >= 0) {
    const [lo, hi] = [Math.min(anchorIdx.value, idx), Math.max(anchorIdx.value, idx)]
    clearSelection()
    for (let i = lo; i <= hi; i++) selection.add(filtered.value[i].name)
    return
  }
  if (ev.ctrlKey || ev.metaKey) {
    if (selection.has(e.name)) selection.delete(e.name)
    else selection.add(e.name)
    anchorIdx.value = idx
    return
  }
  clearSelection()
  selection.add(e.name)
  anchorIdx.value = idx
}
function onListClick() {
  // 空白处点击取消选择(行内点击已 stopPropagation,不会走到这里)
  clearSelection()
}
const singleSel = computed<HostFile | null>(() => {
  if (selection.size !== 1) return null
  return filtered.value.find((e) => selection.has(e.name)) ?? null
})
const selectedEntries = computed(() => filtered.value.filter((e) => selection.has(e.name)))
const compressNames = computed(() => selectedEntries.value.map((e) => e.name).join(', '))

// ---------- 打开 / 编辑 / 预览 / 下载 ----------
function open(e: HostFile) {
  if (e.type === 'directory') {
    go(e.path)
    return
  }
  if (e.type === 'symlink') {
    // 符号链接:优先尝试按目录打开(链接指向目录时列表可正常返回)
    go(e.path)
    return
  }
  if (isImage(e)) {
    previewPath.value = e.path
    return
  }
  if (isArchive(e)) {
    doExtract(e)
    return
  }
  if (isTextFile(e) || e.size < 2 * 1024 * 1024) {
    editorPath.value = e.path
    return
  }
  download(e)
}
function download(e: HostFile | null) {
  if (!e || e.type === 'directory') return
  const a = document.createElement('a')
  a.href = fileDownloadUrl(e.path)
  a.download = e.name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

// ---------- 操作 ----------
async function withBusy(busy: { busy: boolean }, fn: () => Promise<void>) {
  busy.busy = true
  try {
    await fn()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : t('files.errActionFailed'))
  } finally {
    busy.busy = false
  }
}

function openCreate(kind: 'file' | 'dir') {
  create.kind = kind
  create.name = ''
  create.open = true
}
async function doCreate() {
  const name = create.name.trim()
  if (!name || name.includes('/') || name === '..' || name === '.') {
    toastErr(t('files.errInvalidName'))
    return
  }
  await withBusy(create, async () => {
    const p = joinPath(cwd.value, name)
    if (create.kind === 'file') await touchFile(p)
    else await mkdirFile(p)
    create.open = false
    toastOk(t('files.created'))
    reload()
  })
}

function openRename() {
  const e = singleSel.value
  if (!e) return
  rename.name = e.name
  rename.open = true
}
async function doRename() {
  const e = singleSel.value
  const name = rename.name.trim()
  if (!e || !name || name.includes('/') || name === '..' || name === '.') {
    toastErr(t('files.errInvalidName'))
    return
  }
  await withBusy(rename, async () => {
    await renameFile(e.path, joinPath(cwd.value, name))
    rename.open = false
    toastOk(t('files.renamed'))
    reload()
  })
}

// 行内快捷操作(1Panel 行内"更多"下拉)
function openRenameFor(e: HostFile) {
  rename.name = e.name
  rename.open = true
}
function openCompressFor(e: HostFile) {
  compress.name = e.name.endsWith('.tar.gz') ? e.name.replace(/\.tar\.gz$/, '-backup.tar.gz') : e.name.replace(/\.[^.]+$/, '') + '.tar.gz'
  compress.open = true
}
function openDeleteFor(e: HostFile) {
  del.items = [e]
  del.force = false
  del.open = true
}
function openEdit(e: HostFile) {
  if (!isTextFile(e)) {
    toastErr(t('files.editorOnlyText'))
    return
  }
  editorPath.value = e.path
}
function openProps(e: HostFile) {
  propsTarget.value = e
}
function openChmod(e: HostFile) {
  // 属性对话框内已含权限编辑(chmod)
  propsTarget.value = e
}
function openChmodSel() {
  const e = singleSel.value
  if (e) openChmod(e)
}

const DANGEROUS = new Set(['/', '/boot', '/etc', '/usr', '/bin', '/sbin', '/lib', '/lib64', '/root', '/var'])
const hasDirSel = computed(() => del.items.some((e) => e.type === 'directory'))

function openDelete() {
  const items = selectedEntries.value
  if (items.length === 0) return
  const dangerous = items.filter((e) => DANGEROUS.has(e.path) || e.path === rootSeg.value)
  if (dangerous.length > 0) {
    toastErr(t('files.deleteRootForbidden'))
    return
  }
  del.items = items
  del.force = false
  del.open = true
}

async function doDelete() {
  const items = del.items
  if (items.length === 0) return
  del.busy = true
  try {
    const hasDir = items.some((e) => e.type === 'directory')
    const res = await removeFiles(items.map((e) => e.path), hasDir, del.force)
    del.open = false
    toastOk(res.trashed ? t('files.movedToTrash') : t('files.deleted'))
    clearSelection()
    reload()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : t('files.errActionFailed'))
  } finally {
    del.busy = false
  }
}

// ---------- 回收站 ----------
async function openTrash() {
  trashOpen.value = true
  trashSel.clear()
  await loadTrash()
}

async function loadTrash() {
  try {
    const [st, list] = await Promise.all([trashStatus(), trashList()])
    trashEnabled.value = st.enabled
    trashDir.value = st.trashDir
    trashItems.value = list.items
  } catch (e) {
    toastErr(e instanceof Error ? e.message : t('files.errAgent'))
  }
}

async function toggleTrash(v: unknown) {
  const enabled = Boolean(v)
  try {
    await trashSetEnabled(enabled)
    trashEnabled.value = enabled
    toastOk(t(enabled ? 'files.trashToggleOn' : 'files.trashToggleOff'))
  } catch (e) {
    toastErr(e instanceof Error ? e.message : t('files.errActionFailed'))
  }
}

function toggleTrashSel(name: string) {
  if (trashSel.has(name)) trashSel.delete(name)
  else trashSel.add(name)
}

async function doTrashRestore() {
  if (trashSel.size === 0) return
  try {
    await trashRestore(Array.from(trashSel))
    toastOk(t('files.restored'))
    trashSel.clear()
    await loadTrash()
    reload()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : t('files.errActionFailed'))
  }
}

async function doTrashDelete() {
  if (trashSel.size === 0) return
  const names = Array.from(trashSel)
  const ok = await confirm(t('files.deleteWarning') + '\n' + names.map((n) => `· ${n}`).join('\n'), {
    title: t('files.trashDelete'),
    danger: true,
    size: 'lg',
  })
  if (!ok) return
  try {
    await trashDelete(names)
    toastOk(t('files.trashDeleted'))
    trashSel.clear()
    await loadTrash()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : t('files.errActionFailed'))
  }
}

async function doTrashEmpty() {
  const ok = await confirm(t('files.deleteWarning'), {
    title: t('files.trashEmpty'),
    danger: true,
  })
  if (!ok) return
  try {
    await trashEmpty()
    toastOk(t('files.trashEmptied'))
    trashSel.clear()
    await loadTrash()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : t('files.errActionFailed'))
  }
}

function openCompress() {
  const items = selectedEntries.value
  if (items.length === 0) return
  compress.format = 'tar.gz'
  compress.name = items.length === 1 ? `${items[0].name}.tar.gz` : `${baseOf(cwd.value) || 'archive'}.tar.gz`
  compress.open = true
}
async function doCompress() {
  const items = selectedEntries.value
  const name = compress.name.trim()
  if (items.length === 0 || !name || name.includes('/')) {
    toastErr(t('files.errInvalidName'))
    return
  }
  await withBusy(compress, async () => {
    const res = await compressFiles(cwd.value, name, compress.format, items.map((e) => e.name))
    compress.open = false
    toastOk(t('files.compressDone', { name: res.archive.split(/[\\/]/).pop() }))
    reload()
  })
}
function baseOf(p: string): string {
  return p.split(/[\\/]+/).filter(Boolean).pop() || ''
}

async function doExtract(e: HostFile | null) {
  if (!e || !isArchive(e)) return
  const ok = await confirm(`${t('files.extractTo')}\n${e.path}`, {
    title: t('files.extractTitle'),
    danger: false,
    size: 'sm',
  })
  if (!ok) return
  try {
    const res = await extractFile(e.path, cwd.value)
    if (res.skipped > 0) toastOk(t('files.extractSkipped', { n: res.files, m: res.skipped }))
    else toastOk(t('files.extractDone', { n: res.files }))
    reload()
  } catch (err) {
    toastErr(err instanceof Error ? err.message : t('files.errActionFailed'))
  }
}

// ---------- 上传 ----------
function triggerUpload() {
  fileInput.value?.click()
}
async function onFilesSelected() {
  const input = fileInput.value
  if (!input?.files?.length) return
  await uploadList(Array.from(input.files))
  input.value = ''
}
async function onDrop(ev: DragEvent) {
  const files = ev.dataTransfer?.files
  if (files?.length) await uploadList(Array.from(files))
}
async function uploadList(files: File[]) {
  uploading.value = true
  uploadPct.value = 0
  let done = 0
  const total = files.length
  try {
    for (const f of files) {
      await uploadFile(cwd.value, f, (pct) => {
        uploadPct.value = Math.round(((done + pct / 100) / total) * 100)
      })
      done++
      uploadPct.value = Math.round((done / total) * 100)
    }
    toastOk(t('files.uploadDone'))
    reload()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : t('files.errUpload'))
  } finally {
    uploading.value = false
  }
}

// ---------- 递归搜索 ----------
async function doDeepSearch() {
  const q = deepQuery.value.trim()
  if (!q) return
  deepLoading.value = true
  deepResults.value = []
  try {
    const res = await searchFiles(cwd.value, q, 200)
    deepResults.value = res.results
    deepTruncated.value = res.truncated
  } catch (e) {
    toastErr(e instanceof Error ? e.message : t('files.errActionFailed'))
  } finally {
    deepLoading.value = false
  }
}
function goToResult(r: { path: string }) {
  deepSearchOpen.value = false
  const parts = r.path.split(/[\\/]+/).filter(Boolean)
  if (/^[A-Za-z]:$/.test(parts[0] || '')) {
    parts.pop()
    go(parts.length > 1 ? parts.join('\\') + '\\' : parts[0] + '\\')
  } else {
    parts.pop()
    go('/' + parts.join('/'))
  }
}

// ---------- 右键菜单 ----------
function onRowContext(e: HostFile, ev: MouseEvent) {
  if (!isSelected(e)) {
    clearSelection()
    selection.add(e.name)
  }
  ctx.entry = e
  ctx.x = Math.min(ev.clientX, window.innerWidth - 190)
  ctx.y = Math.min(ev.clientY, window.innerHeight - 320)
  ctx.visible = true
}
function onListContext(ev: MouseEvent) {
  ctx.entry = null
  ctx.x = Math.min(ev.clientX, window.innerWidth - 190)
  ctx.y = Math.min(ev.clientY, window.innerHeight - 320)
  ctx.visible = true
}

const ctxItems = computed<CtxMenuItem[]>(() => {
  const e = ctx.entry
  if (!e) {
    return [
      { key: 'newFile', label: 'files.newFile', icon: 'plus' },
      { key: 'newFolder', label: 'files.newFolder', icon: 'folder' },
      { key: 'refresh', label: 'files.refresh', icon: 'refresh' },
    ]
  }
  const items: CtxMenuItem[] = [{ key: 'open', label: 'files.open', icon: 'arrowRight' }]
  if (e.type === 'file' || e.type === 'symlink') {
    if (isImage(e)) items.push({ key: 'preview', label: 'files.preview', icon: 'image' })
    else if (isArchive(e)) items.push({ key: 'extract', label: 'files.extract', icon: 'archive' })
    else if (isTextFile(e)) items.push({ key: 'edit', label: 'files.edit', icon: 'edit' })
    items.push({ key: 'download', label: 'files.download', icon: 'download' })
  }
  items.push(
    { key: 'copy', label: 'files.copy', icon: 'copy' },
    { key: 'move', label: 'files.move', icon: 'move' },
    { key: 'rename', label: 'files.rename', icon: 'edit' },
    { key: 'compress', label: 'files.compress', icon: 'archive' },
    { key: 'delete', label: 'files.delete', icon: 'trash', danger: true },
    { key: 'props', label: 'files.properties', icon: 'info' },
    { key: 'terminal', label: 'files.openInTerminal', icon: 'terminal', disabled: e.type !== 'directory' && e.type !== 'symlink' },
  )
  return items
})

function onCtxAction(key: string) {
  const e = ctx.entry
  switch (key) {
    case 'newFile':
      openCreate('file')
      break
    case 'newFolder':
      openCreate('dir')
      break
    case 'refresh':
      reload()
      break
    case 'open':
      if (e) open(e)
      break
    case 'preview':
      if (e) previewPath.value = e.path
      break
    case 'edit':
      if (e) editorPath.value = e.path
      break
    case 'download':
      download(e)
      break
    case 'extract':
      if (e) void doExtract(e)
      break
    case 'copy':
      openCopyMove('copy')
      break
    case 'move':
      openCopyMove('cut')
      break
    case 'rename':
      openRename()
      break
    case 'compress':
      openCompress()
      break
    case 'delete':
      void openDelete()
      break
    case 'props':
      propsTarget.value = e
      break
    case 'terminal':
      if (e) router.push({ path: '/terminal', query: { cwd: e.path } })
      break
  }
}

// ---------- 图标 / 时间 ----------
function iconFor(e: HostFile): IconName {
  if (e.type === 'directory') return 'folder'
  if (e.type === 'symlink') return 'link'
  if (e.type === 'socket') return 'network'
  if (e.type === 'device' || e.type === 'fifo') return 'box'
  if (isImage(e)) return 'image'
  if (isArchive(e)) return 'archive'
  return 'fileText'
}
function iconColor(e: HostFile): string {
  if (e.type === 'directory') return 'text-brand'
  if (e.type === 'symlink') return 'text-muted'
  if (isImage(e)) return 'text-muted'
  return 'text-muted'
}
function formatTime(s: string): string {
  // YYYY-MM-DD HH:MM:SS(1Panel 样式)
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s || '—'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// 权限八进制显示(1Panel 样式:0755)
function permOctal(e: HostFile): string {
  if (e.type === 'symlink') return 'lrwxrwxrwx'
  if (e.mode <= 0) return '—'
  return '0' + (e.mode & 0o7777).toString(8)
}
</script>

<style scoped>
.files-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
.crumb {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 12.5px;
  color: var(--dm-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  white-space: nowrap;
}
.crumb:hover {
  color: var(--dm-text);
  background: var(--dm-surface2);
}
.crumb.active {
  color: var(--color-brand);
  font-weight: 500;
}
.crumb:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.list-row:hover {
  background: var(--dm-surface2);
}
.list-row.selected {
  background: color-mix(in srgb, var(--color-brand) 14%, transparent);
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
