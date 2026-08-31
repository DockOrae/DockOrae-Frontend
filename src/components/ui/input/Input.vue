<script setup lang="ts">
import { computed } from "vue";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface Props {
  defaultValue?: string | number | null;
  modelValue?: string | number | null;
  modelModifiers?: { number?: boolean; trim?: boolean };
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), {
  modelModifiers: () => ({}),
});

const emits = defineEmits<{
  "update:modelValue": [value: string | number | null];
}>();

// 支持 v-model.number / v-model.trim(与原生行为一致:parseFloat 失败保留原值)
const modelValue = computed({
  get: (): string | number => props.modelValue ?? props.defaultValue ?? "",
  set: (v: string | number) => {
    let out: string | number = v
    if (props.modelModifiers?.number) {
      const n = parseFloat(String(v))
      out = Number.isNaN(n) ? v : n
    }
    if (props.modelModifiers?.trim) out = String(out).trim()
    emits("update:modelValue", out)
  },
});
</script>

<template>
  <input
    v-model="modelValue"
    data-slot="input"
    :class="
      cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input bg-input h-9 w-full min-w-0 rounded-[0.6rem] border px-3 py-2 text-[length:var(--fs-md)] text-text shadow-none transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:border-brand focus-visible:ring-brand/30 focus-visible:ring-2',
        'aria-invalid:ring-destructive/20 aria-invalid:border-destructive',
        props.class,
      )
    "
  />
</template>
