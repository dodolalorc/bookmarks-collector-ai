<script setup lang="ts">
import { computed } from "vue"

import type { SnippetCollectionFolder, SnippetCollectionItem } from "../sdk/types"

const props = defineProps<{
  item: SnippetCollectionItem
  folders: SnippetCollectionFolder[]
  expanded: boolean
  editing: boolean
  draftTitle: string
  draftText: string
}>()

const emit = defineEmits<{
  toggleExpand: [itemId: string]
  startEdit: [itemId: string]
  cancelEdit: [itemId: string]
  updateDraftTitle: [value: string]
  updateDraftText: [value: string]
  saveEdit: [itemId: string]
  delete: [itemId: string]
  move: [payload: { itemId: string; folderId: string }]
}>()

const folderName = computed(
  () => props.folders.find((folder) => folder.id === props.item.folderId)?.name || "未分类内容"
)
</script>

<template>
  <article class="snippet-card">
    <div class="snippet-head">
      <div class="snippet-meta">
        <div class="snippet-title-row">
          <div class="snippet-title">{{ item.title }}</div>
          <span class="snippet-badge">{{ item.mode === "selection" ? "划线" : "框选" }}</span>
        </div>
        <div class="snippet-subline">
          <span>所在收藏夹：{{ folderName }}</span>
          <span v-if="item.sourceUrl">来源：{{ item.sourceUrl }}</span>
        </div>
      </div>
      <div class="snippet-actions">
        <button class="ghost-button" @click="emit('toggleExpand', item.id)">
          {{ expanded ? "收起原文" : "查看原文" }}
        </button>
        <button v-if="!editing" class="ghost-button" @click="emit('startEdit', item.id)">
          编辑
        </button>
        <button class="danger-button" @click="emit('delete', item.id)">删除</button>
      </div>
    </div>

    <template v-if="editing">
      <div class="editor-grid">
        <input
          class="field"
          :value="draftTitle"
          placeholder="段落标题"
          @input="emit('updateDraftTitle', ($event.target as HTMLInputElement).value)" />
        <textarea
          class="field"
          rows="5"
          :value="draftText"
          placeholder="段落内容"
          @input="emit('updateDraftText', ($event.target as HTMLTextAreaElement).value)" />
      </div>
      <div class="inline-actions">
        <button class="primary-button" @click="emit('saveEdit', item.id)">保存</button>
        <button class="ghost-button" @click="emit('cancelEdit', item.id)">取消</button>
      </div>
    </template>
    <template v-else>
      <p class="snippet-text">{{ item.text }}</p>
    </template>

    <div class="move-row">
      <label class="move-label">
        移动到
        <select
          class="select"
          :value="item.folderId"
          @change="
            emit('move', {
              itemId: item.id,
              folderId: ($event.target as HTMLSelectElement).value
            })
          ">
          <option v-for="folder in folders" :key="folder.id" :value="folder.id">
            {{ folder.name }}
          </option>
        </select>
      </label>
    </div>

    <div v-if="item.analysisSummary" class="analysis-block">
      <div class="analysis-title">摘要</div>
      <div>{{ item.analysisSummary }}</div>
    </div>

    <div v-if="item.analysisTags?.length" class="tag-row">
      <span v-for="tag in item.analysisTags" :key="tag" class="tag-chip">{{ tag }}</span>
    </div>

    <div v-if="expanded" class="original-block">
      <div class="analysis-title">原始内容</div>
      <div class="original-text">{{ item.originalText }}</div>
      <div v-if="item.selector" class="selector-text">{{ item.selector }}</div>
    </div>
  </article>
</template>

<style scoped>
.snippet-card {
  border: 1px solid rgba(122, 150, 192, 0.18);
  border-radius: 18px;
  padding: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(246, 250, 255, 0.98));
  box-shadow: 0 10px 24px rgba(98, 124, 167, 0.08);
}

.snippet-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.snippet-meta {
  min-width: 0;
  flex: 1;
}

.snippet-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.snippet-title {
  font-size: 16px;
  font-weight: 800;
  color: #22314f;
}

.snippet-badge {
  padding: 2px 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffe0f3 0%, #dff5ff 100%);
  color: #4966a6;
  font-size: 12px;
  font-weight: 700;
}

.snippet-subline {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  font-size: 12px;
  color: #72809b;
  word-break: break-all;
}

.snippet-actions,
.inline-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.ghost-button,
.danger-button,
.primary-button {
  border: 0;
  border-radius: 999px;
  padding: 9px 14px;
  font: inherit;
  cursor: pointer;
}

.ghost-button {
  background: #edf4ff;
  color: #4f6799;
}

.danger-button {
  background: #ffe9ed;
  color: #c63a57;
}

.primary-button {
  background: linear-gradient(135deg, #6f95ff 0%, #59bfff 100%);
  color: #fff;
}

.snippet-text,
.original-text {
  margin: 14px 0 0;
  color: #24314a;
  line-height: 1.7;
  white-space: pre-wrap;
}

.move-row,
.analysis-block,
.original-block {
  margin-top: 14px;
}

.move-label {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #607089;
  font-size: 13px;
}

.field,
.select {
  width: 100%;
  min-height: 42px;
  border-radius: 12px;
  border: 1px solid #d4deee;
  padding: 10px 14px;
  background: #fff;
  color: #23324f;
  font: inherit;
  box-sizing: border-box;
}

.editor-grid {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

.analysis-title {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #7b8ab1;
}

.tag-row {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip {
  padding: 4px 10px;
  border-radius: 999px;
  background: #e8f3ff;
  color: #4d6d99;
  font-size: 12px;
}

.selector-text {
  margin-top: 10px;
  font-size: 12px;
  color: #7e8aa5;
  word-break: break-all;
}

@media (max-width: 900px) {
  .snippet-head {
    flex-direction: column;
  }
}
</style>
