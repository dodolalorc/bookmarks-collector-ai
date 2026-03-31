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
  margin-bottom: 12px;
}

.section-header--compact {
  margin-bottom: 8px;
}

.section-eyebrow {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 800;
  color: #7a88a6;
  margin-bottom: 6px;
}

.section-title {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
  color: #172033;
}

.section-header--compact .section-title {
  font-size: 18px;
}

.section-subtitle {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: #627089;
}
</style>
