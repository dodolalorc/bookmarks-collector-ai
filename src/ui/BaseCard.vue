<template>
  <section class="base-card">
    <slot />
  </section>
</template>

<style scoped>
.base-card {
  background: color-mix(in srgb, var(--sf-color-surface) 92%, transparent);
  border: 1px solid var(--sf-color-border);
  border-radius: var(--sf-radius-lg);
  padding: var(--sf-space-3);
  box-shadow: 0 12px 30px rgba(23, 32, 51, 0.08);
}
</style>
