<template>
  <section class="base-card">
    <slot />
  </section>
</template>

<style scoped>
.base-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(23, 32, 51, 0.08);
  border-radius: 16px;
  padding: 14px;
  box-shadow: 0 12px 30px rgba(23, 32, 51, 0.08);
}
</style>
