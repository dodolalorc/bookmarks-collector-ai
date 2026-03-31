<script setup lang="ts">
import type { CapturedSnippet } from "../sdk/types"

defineProps<{
  snippet: CapturedSnippet
}>()

defineEmits<{
  delete: [snippetId: string]
}>()
</script>

<template>
  <div class="snippet-card">
    <div class="snippet-head">
      <div>
        <div class="snippet-mode">
          {{ snippet.mode === "selection" ? "Selection" : "Element" }}
        </div>
        <div class="snippet-label">{{ snippet.label }}</div>
      </div>
      <button class="snippet-delete" @click="$emit('delete', snippet.id)">
        删除
      </button>
    </div>
    <div v-if="snippet.selector" class="snippet-selector">
      {{ snippet.selector }}
    </div>
    <div class="snippet-text">{{ snippet.text.slice(0, 420) }}</div>
  </div>
</template>

<style scoped>
.snippet-card {
  border: 1px solid rgba(112, 135, 168, 0.14);
  border-radius: 18px;
  padding: 12px;
  background: linear-gradient(180deg, #fff 0%, #f7fbff 100%);
  box-shadow: 0 8px 20px rgba(101, 133, 173, 0.08);
}

.snippet-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
  margin-bottom: 8px;
}

.snippet-mode {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6d7fb0;
}

.snippet-label {
  font-size: 12px;
  color: #7f8ca6;
  margin-top: 3px;
}

.snippet-delete {
  border: 0;
  border-radius: 999px;
  padding: 6px 9px;
  background: #eef4ff;
  color: #5d6f98;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.snippet-selector {
  font-size: 11px;
  color: #8d99b3;
  word-break: break-all;
  margin-bottom: 8px;
}

.snippet-text {
  font-size: 12px;
  line-height: 1.7;
  color: #25324d;
  white-space: pre-wrap;
}
</style>
