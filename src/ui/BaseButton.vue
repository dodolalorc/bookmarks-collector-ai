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
  border: 1px solid transparent;
  border-radius: var(--sf-radius-md);
  min-height: var(--sf-button-height);
  padding: 0 var(--sf-button-padding-x);
  font-size: var(--sf-font-size-md);
  font-weight: 500;
  font-family: var(--sf-font-family);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sf-space-2);
  line-height: var(--sf-line-height-tight);
  cursor: pointer;
  transition:
    opacity 0.15s,
    background 0.12s;
}

.base-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.base-button--primary {
  background: var(--sf-color-primary);
  color: var(--sf-color-surface);
  border-color: var(--sf-color-primary);
}

.base-button--primary:hover:not(:disabled) {
  opacity: 0.82;
}

.base-button--secondary {
  background: var(--sf-color-surface);
  color: var(--sf-color-text);
  border-color: var(--sf-color-border-medium);
}

.base-button--secondary:hover:not(:disabled) {
  background: var(--sf-color-surface-soft);
}

.base-button--accent {
  background: var(--sf-color-accent);
  color: var(--sf-color-surface);
  border-color: var(--sf-color-accent);
}

.base-button--accent:hover:not(:disabled) {
  opacity: 0.85;
}
</style>
