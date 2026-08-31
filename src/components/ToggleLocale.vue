<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="locale-btn"
        :title="t('lang.toggle')"
        :aria-label="t('lang.toggle')"
      >
        <Icon name="translate" size="14" filled />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-52 max-h-80 overflow-y-auto">
      <DropdownMenuItem
        v-for="l in LANGS"
        :key="l.code"
        class="text-[length:var(--fs-md2)]"
        :class="l.code === current.code ? 'text-brand' : ''"
        @select="onPick(l.code)"
      >
        <span class="mr-2" aria-hidden="true">{{ l.flag }}</span>
        <span>{{ l.label }}</span>
        <Icon v-if="locale === l.code" name="check" size="14" class="ml-auto text-brand" />
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from './Icon.vue'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LANGS, setLang } from '../i18n'
import type { LocaleCode } from '../i18n'

const { t, locale } = useI18n()

const current = computed(() => LANGS.find((l) => l.code === locale.value) || LANGS[0])

function onPick(code: string) {
  setLang(code as LocaleCode)
}
</script>

<style scoped>
/* 语言切换按钮:与旁边主题(亮/暗)按钮同尺寸(36px) */
.locale-btn {
  width: 36px !important;
  height: 36px !important;
  min-width: 36px !important;
}
</style>
