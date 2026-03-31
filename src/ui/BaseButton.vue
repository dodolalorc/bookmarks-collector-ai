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
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.base-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.base-button--primary {
  background: #172033;
  color: #fff;
}

.base-button--secondary {
  background: #eef4ff;
  color: #172033;
}

.base-button--accent {
  background: #ffb84d;
  color: #172033;
}
</style>
