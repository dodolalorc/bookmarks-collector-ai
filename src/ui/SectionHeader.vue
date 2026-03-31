<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    eyebrow?: string
    compact?: boolean
  }>(),
  {
    subtitle: "",
    eyebrow: "",
    compact: false
  }
)
</script>

<template>
  <div :class="['section-header', { 'section-header--compact': compact }]">
    <div v-if="eyebrow" class="section-eyebrow">{{ eyebrow }}</div>
    <h2 class="section-title">{{ title }}</h2>
    <p v-if="subtitle" class="section-subtitle">{{ subtitle }}</p>
  </div>
</template>

<style scoped>
.section-header {
  margin-bottom: var(--sf-space-3);
}

.section-header--compact {
  margin-bottom: var(--sf-space-2);
}

.section-eyebrow {
  font-size: var(--sf-font-size-xs);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 800;
  color: #7a88a6;
  margin-bottom: var(--sf-space-1);
}

.section-title {
  margin: 0;
  font-size: var(--sf-font-size-xl);
  line-height: var(--sf-line-height-tight);
  color: var(--sf-color-text);
}

.section-header--compact .section-title {
  font-size: var(--sf-font-size-lg);
}

.section-subtitle {
  margin: var(--sf-space-2) 0 0;
  font-size: var(--sf-font-size-sm);
  line-height: var(--sf-line-height-relaxed);
  color: var(--sf-color-text-muted);
}
</style>
