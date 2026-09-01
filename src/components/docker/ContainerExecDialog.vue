<template>
  <Modal :model-value="open" :title="title" size="2xl" @close="emit('close')">
    <DetailTerminal :id="id" :running="running" />
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '../Modal.vue'
import DetailTerminal from '../../views/container/DetailTerminal.vue'

const props = defineProps<{ open: boolean; id: string; name?: string; running: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()
const { t } = useI18n()

const title = computed(() => `${t('terminal.containerTitle')} · ${props.name || props.id.slice(0, 12)}`)
</script>
