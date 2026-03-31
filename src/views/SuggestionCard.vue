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
        <i class="fa-solid fa-folder-open" aria-hidden="true" />
        {{ suggestion.path }}
      </div>
      <div class="reason">{{ suggestion.reason }}</div>
    </div>
  </label>
</template>

<style scoped>
.suggestion {
  border: 1px solid rgba(23, 32, 51, 0.08);
  background: #fff;
  border-radius: 14px;
  padding: 12px;
  display: flex;
  gap: 10px;
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
  gap: 10px;
  margin-bottom: 8px;
}

.muted {
  color: #627089;
  font-size: 13px;
  line-height: 1.5;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.reason {
  font-size: 13px;
  margin-top: 8px;
  line-height: 1.5;
}
</style>
