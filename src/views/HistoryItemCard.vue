<script setup lang="ts">
import type { HistoryRecommendationItem } from "../sdk/types"

const props = defineProps<{
  item: HistoryRecommendationItem
  checked: boolean
}>()

const emit = defineEmits<{
  toggle: [id: string]
}>()

const onToggle = () => {
  emit("toggle", props.item.bookmark.id)
}
</script>

<template>
  <label class="history-item" :class="{ selected: checked }">
    <div class="history-main">
      <input type="checkbox" :checked="checked" @change="onToggle" />
      <div>
        <div class="item-title">{{ item.bookmark.title }}</div>
        <div class="item-url">
          <font-awesome-icon icon="link" />
          {{ item.bookmark.url }}
        </div>
        <div class="item-path">
          <font-awesome-icon icon="folder-tree" />
          当前目录：{{ item.bookmark.parentPath || "未识别" }}
        </div>
        <div class="target">
          <div class="item-title">推荐目标</div>
          <div>
            {{ item.recommendation.suggestions[0]?.path || "暂无推荐" }}
          </div>
          <div class="item-path">
            {{
              item.recommendation.suggestions[0]?.reason ||
              "当前没有生成推荐结果"
            }}
          </div>
        </div>
      </div>
    </div>
  </label>
</template>

<style scoped>
.history-item {
  display: block;
  border: 1px solid var(--sf-color-border);
  border-radius: var(--sf-radius-lg);
  padding: var(--sf-space-3);
  background: var(--sf-color-surface);
}

.history-item.selected {
  border-color: #ffb84d;
  background: #fff8e8;
}

.history-main {
  display: flex;
  gap: var(--sf-space-2);
}

.item-title {
  font-weight: 800;
  margin-bottom: var(--sf-space-1);
}

.item-url {
  font-size: var(--sf-font-size-sm);
  color: var(--sf-color-text-muted);
  margin-bottom: var(--sf-space-2);
  word-break: break-all;
  display: inline-flex;
  align-items: center;
  gap: var(--sf-space-1);
}

.item-path {
  font-size: var(--sf-font-size-sm);
  color: var(--sf-color-text-muted);
  margin-bottom: var(--sf-space-2);
  display: inline-flex;
  align-items: center;
  gap: var(--sf-space-1);
}

.target {
  border-radius: var(--sf-radius-md);
  background: var(--sf-color-surface-soft);
  padding: var(--sf-space-2);
  font-size: var(--sf-font-size-sm);
  line-height: var(--sf-line-height-relaxed);
}
</style>
