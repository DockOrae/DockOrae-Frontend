<template>
  <LogViewer :stream="`/containers/${id}/logs`" follow />
</template>

<script setup lang="ts">
import LogViewer from '../../components/LogViewer.vue'

defineProps<{ id: string }>()
</script>
