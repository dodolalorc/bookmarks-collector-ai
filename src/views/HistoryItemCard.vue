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
          <i class="fa-solid fa-link" aria-hidden="true" />
          {{ item.bookmark.url }}
        </div>
        <div class="item-path">
          <i class="fa-solid fa-folder-tree" aria-hidden="true" />
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
  border: 1px solid rgba(23, 32, 51, 0.08);
  border-radius: 16px;
  padding: 14px;
  background: #fff;
}

.history-item.selected {
  border-color: #ffb84d;
  background: #fff8e8;
}

.history-main {
  display: flex;
  gap: 10px;
}

.item-title {
  font-weight: 800;
  margin-bottom: 6px;
}

.item-url {
  font-size: 13px;
  color: #627089;
  margin-bottom: 8px;
  word-break: break-all;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.item-path {
  font-size: 13px;
  color: #627089;
  margin-bottom: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.target {
  border-radius: 12px;
  background: #f6f8fb;
  padding: 10px;
  font-size: 13px;
  line-height: 1.6;
}
</style>
