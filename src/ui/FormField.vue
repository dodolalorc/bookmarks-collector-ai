<script setup lang="ts">
defineProps<{
  label: string
  hint?: string
}>()
</script>

<template>
  <label class="form-field">
    <div class="form-label">{{ label }}</div>
    <div v-if="hint" class="form-hint">{{ hint }}</div>
    <slot />
  </label>
</template>

<style scoped>
.form-field {
  display: block;
  margin-bottom: var(--sf-space-3);
}

.form-label {
  color: #44506a;
  font-size: var(--sf-font-size-md);
  font-weight: 700;
  margin-bottom: var(--sf-space-1);
}

.form-hint {
  color: var(--sf-color-text-muted);
  font-size: var(--sf-font-size-sm);
  margin-bottom: var(--sf-space-1);
  line-height: var(--sf-line-height-normal);
}
</style>
