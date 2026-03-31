<script setup lang="ts">
import type { FolderSuggestion } from "../sdk/types"

const props = defineProps<{
  suggestion: FolderSuggestion
  selected: boolean
}>()

const emit = defineEmits<{
  select: [key: string]
}>()

const onSelect = () => {
  emit("select", props.suggestion.key)
}
</script>

<template>
  <label class="suggestion" :class="{ active: selected }">
    <input
      :checked="selected"
      :value="suggestion.key"
      name="suggestion"
      type="radio"
      @change="onSelect" />
    <div class="content">
      <div class="row">
        <strong>{{ suggestion.title }}</strong>
        <span class="muted">{{
          suggestion.type === "create" ? "建议新建" : "现有文件夹"
        }}</span>
      </div>
      <div class="muted">
        <font-awesome-icon icon="folder-open" />
        {{ suggestion.path }}
      </div>
      <div class="reason">{{ suggestion.reason }}</div>
    </div>
  </label>
</template>

<style scoped>
.suggestion {
  border: 1px solid var(--sf-color-border);
  background: var(--sf-color-surface);
  border-radius: var(--sf-radius-md);
  padding: var(--sf-space-3);
  display: flex;
  gap: var(--sf-space-2);
}

.suggestion.active {
  border-color: #ffb84d;
  background: #fff6df;
}

.content {
  flex: 1;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sf-space-2);
  margin-bottom: var(--sf-space-2);
}

.muted {
  color: var(--sf-color-text-muted);
  font-size: var(--sf-font-size-sm);
  line-height: var(--sf-line-height-normal);
  display: inline-flex;
  align-items: center;
  gap: var(--sf-space-1);
}

.reason {
  font-size: var(--sf-font-size-sm);
  margin-top: var(--sf-space-2);
  line-height: var(--sf-line-height-normal);
}
</style>
