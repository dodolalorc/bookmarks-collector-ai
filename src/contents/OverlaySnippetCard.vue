<script setup lang="ts">
import type { CapturedSnippet } from "../sdk/types"

defineProps<{
  snippet: CapturedSnippet
}>()

defineEmits<{
  analyze: [snippetId: string]
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
        <div v-if="snippet.analysisTags?.length" class="snippet-tags">
          <span
            v-for="tag in snippet.analysisTags"
            :key="tag"
            class="snippet-tag">
            {{ tag }}
          </span>
        </div>
      </div>
      <div class="snippet-actions">
        <button class="snippet-analyze" @click="$emit('analyze', snippet.id)">
          <font-awesome-icon icon="wand-magic-sparkles" />
        </button>
        <button class="snippet-delete" @click="$emit('delete', snippet.id)">
          <font-awesome-icon icon="trash" />
        </button>
      </div>
    </div>
    <div v-if="snippet.selector" class="snippet-selector">
      {{ snippet.selector }}
    </div>
    <div class="snippet-text">{{ snippet.text.slice(0, 420) }}</div>
    <div v-if="snippet.analysisSummary" class="snippet-summary">
      {{ snippet.analysisSummary }}
    </div>
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
  font-size: 13px;
  color: #7f8ca6;
  margin-top: 3px;
}

.snippet-tags {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.snippet-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #eaf4ff;
  color: #4d6f9d;
}

.snippet-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.snippet-analyze,
.snippet-delete {
  border: 0;
  border-radius: 999px;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.snippet-analyze {
  background: #eef4ff;
  color: #5d6f98;
}

.snippet-delete {
  background: #ffebee;
  color: #cf263f;
}

.snippet-selector {
  font-size: 11px;
  color: #8d99b3;
  word-break: break-all;
  margin-bottom: 8px;
}

.snippet-text {
  font-size: 13px;
  line-height: 1.7;
  color: #25324d;
  white-space: pre-wrap;
}

.snippet-summary {
  margin-top: 10px;
  padding: 10px;
  border-radius: 10px;
  background: #f4f9ff;
  color: #324a72;
  font-size: 13px;
  line-height: 1.6;
}
</style>
