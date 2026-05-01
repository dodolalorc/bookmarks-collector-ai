<template>
  <section class="base-card">
    <slot />
  </section>
</template>

<style scoped>
.base-card {
  background: var(--sf-color-surface);
  border: 1px solid var(--sf-color-border);
  border-radius: var(--sf-radius-lg);
  padding: var(--sf-space-4);
}
</style>
