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
  margin-bottom: 14px;
}

.form-label {
  color: #44506a;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 6px;
}

.form-hint {
  color: #627089;
  font-size: 13px;
  margin-bottom: 6px;
  line-height: 1.5;
}
</style>
