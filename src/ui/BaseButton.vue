<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "accent"
    disabled?: boolean
    type?: "button" | "submit" | "reset"
  }>(),
  {
    variant: "secondary",
    disabled: false,
    type: "button"
  }
)
</script>

<template>
  <button
    :class="['base-button', `base-button--${variant}`]"
    :disabled="disabled"
    :type="type">
    <slot />
  </button>
</template>

<style scoped>
.base-button {
  border: 0;
  border-radius: var(--sf-radius-md);
  min-height: var(--sf-button-height);
  padding: 0 var(--sf-button-padding-x);
  font-size: var(--sf-font-size-md);
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sf-space-2);
  line-height: var(--sf-line-height-tight);
  cursor: pointer;
}

.base-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.base-button--primary {
  background: var(--sf-color-primary);
  color: var(--sf-color-surface);
}

.base-button--secondary {
  background: #eef4ff;
  color: var(--sf-color-text);
}

.base-button--accent {
  background: var(--sf-color-accent);
  color: var(--sf-color-text);
}
</style>
