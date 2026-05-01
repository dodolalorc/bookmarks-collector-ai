<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"

import type { KnowledgeItem, KnowledgeQuery } from "../types/knowledge"
import { KNOWLEDGE_CATEGORIES } from "../types/knowledge"

async function sendMessage<T>(type: string, payload?: unknown): Promise<T> {
  const response = await chrome.runtime.sendMessage({ type, payload })
  if (!response?.ok) throw new Error(response?.error ?? "操作失败")
  return response.payload as T
}

const items = ref<KnowledgeItem[]>([])
const isLoading = ref(true)
const keyword = ref("")
const selectedCategory = ref("")
const selectedItem = ref<KnowledgeItem | null>(null)
const statusMsg = ref("")
const isDeleting = ref(false)
const isRetryingAi = ref(false)

const categories = ["", ...KNOWLEDGE_CATEGORIES]

const query = computed<KnowledgeQuery>(() => ({
  keyword: keyword.value || undefined,
  category: selectedCategory.value || undefined,
  orderBy: "createdAt",
  orderDir: "desc"
}))

async function loadItems() {
  isLoading.value = true
  try {
    items.value = await sendMessage<KnowledgeItem[]>(
      "knowledge/list",
      query.value
    )
  } catch (e) {
    statusMsg.value = e instanceof Error ? e.message : "加载失败"
  } finally {
    isLoading.value = false
  }
}

watch([keyword, selectedCategory], () => {
  void loadItems()
})

onMounted(loadItems)

function selectItem(item: KnowledgeItem) {
  selectedItem.value = item
}

function closeDetail() {
  selectedItem.value = null
}

async function toggleFavorite(item: KnowledgeItem) {
  await sendMessage("knowledge/update", {
    id: item.id,
    favorite: !item.favorite
  })
  item.favorite = !item.favorite
}

async function deleteItem(item: KnowledgeItem) {
  if (!confirm(`确认删除「${item.title}」？`)) return
  isDeleting.value = true
  try {
    await sendMessage("knowledge/delete", { id: item.id })
    items.value = items.value.filter((i) => i.id !== item.id)
    if (selectedItem.value?.id === item.id) selectedItem.value = null
  } catch (e) {
    statusMsg.value = e instanceof Error ? e.message : "删除失败"
  } finally {
    isDeleting.value = false
  }
}

async function retryAi(item: KnowledgeItem) {
  isRetryingAi.value = true
  try {
    const updated = await sendMessage<KnowledgeItem>("knowledge/retry-ai", {
      id: item.id
    })
    const index = items.value.findIndex((i) => i.id === item.id)
    if (index !== -1) items.value[index] = updated
    if (selectedItem.value?.id === item.id) selectedItem.value = updated
    statusMsg.value = "AI 重新整理完成"
    setTimeout(() => {
      statusMsg.value = ""
    }, 3000)
  } catch (e) {
    statusMsg.value = e instanceof Error ? e.message : "AI 重试失败"
  } finally {
    isRetryingAi.value = false
  }
}

async function exportMarkdown(item: KnowledgeItem) {
  const lines = [`# ${item.title}`, "", `原文链接：${item.url}`, ""]
  if (item.summary) {
    lines.push("## 摘要", "", item.summary, "")
  }
  if (item.keyPoints?.length) {
    lines.push("## 关键点", "", ...item.keyPoints.map((p) => `- ${p}`), "")
  }
  if (item.tags.length) {
    lines.push("## 标签", "", item.tags.map((t) => `#${t}`).join(" "), "")
  }
  if (item.content) {
    lines.push("## 原文摘录", "", item.content.slice(0, 2000), "")
  }

  const blob = new Blob([lines.join("\n")], { type: "text/markdown" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${item.title.slice(0, 40).replace(/[/\\?%*:|"<>]/g, "_")}.md`
  a.click()
  URL.revokeObjectURL(url)
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  })
}
</script>

<template>
  <div class="kb">
    <!-- 工具栏 -->
    <div class="kb__toolbar">
      <input
        v-model="keyword"
        class="kb__search"
        type="text"
        placeholder="搜索标题、摘要、标签…" />
      <select v-model="selectedCategory" class="kb__select">
        <option value="">全部分类</option>
        <option v-for="cat in KNOWLEDGE_CATEGORIES" :key="cat" :value="cat">
          {{ cat }}
        </option>
      </select>
    </div>

    <div v-if="statusMsg" class="kb__status">{{ statusMsg }}</div>

    <div class="kb__body">
      <!-- 列表 -->
      <div class="kb__list">
        <div v-if="isLoading" class="kb__empty">加载中…</div>
        <div v-else-if="items.length === 0" class="kb__empty">
          <div class="kb__empty-icon">📚</div>
          <div>还没有保存任何内容</div>
          <div class="kb__empty-hint">
            去网页上点击悬浮按钮，开始构建你的学习资料库。
          </div>
        </div>

        <div
          v-for="item in items"
          :key="item.id"
          class="kb__card"
          :class="{ 'kb__card--active': selectedItem?.id === item.id }"
          @click="selectItem(item)">
          <div class="kb__card-header">
            <div class="kb__card-title">{{ item.title || "无标题" }}</div>
            <div class="kb__card-actions">
              <button
                class="kb__icon-btn"
                :title="item.favorite ? '取消收藏' : '收藏'"
                @click.stop="toggleFavorite(item)">
                {{ item.favorite ? "⭐" : "☆" }}
              </button>
              <button
                class="kb__icon-btn kb__icon-btn--danger"
                title="删除"
                :disabled="isDeleting"
                @click.stop="deleteItem(item)">
                🗑️
              </button>
            </div>
          </div>
          <div v-if="item.summary" class="kb__card-summary">
            {{ item.summary }}
          </div>
          <div class="kb__card-footer">
            <span class="kb__tag kb__tag--cat">{{ item.category }}</span>
            <span
              v-for="tag in item.tags.slice(0, 3)"
              :key="tag"
              class="kb__tag"
              >{{ tag }}</span
            >
            <span
              v-if="item.aiStatus === 'failed'"
              class="kb__tag kb__tag--error"
              >AI失败</span
            >
            <span class="kb__card-time">{{ formatDate(item.createdAt) }}</span>
          </div>
        </div>
      </div>

      <!-- 详情面板 -->
      <div v-if="selectedItem" class="kb__detail">
        <div class="kb__detail-header">
          <div class="kb__detail-title">{{ selectedItem.title }}</div>
          <button class="kb__icon-btn" @click="closeDetail">✕</button>
        </div>

        <div class="kb__detail-body">
          <a :href="selectedItem.url" target="_blank" class="kb__detail-url">
            {{ selectedItem.url }}
          </a>

          <div class="kb__detail-tags">
            <span class="kb__tag kb__tag--cat">{{
              selectedItem.category
            }}</span>
            <span v-if="selectedItem.subCategory" class="kb__tag">{{
              selectedItem.subCategory
            }}</span>
            <span v-for="tag in selectedItem.tags" :key="tag" class="kb__tag">{{
              tag
            }}</span>
          </div>

          <div v-if="selectedItem.summary" class="kb__detail-section">
            <div class="kb__detail-section-title">摘要</div>
            <div class="kb__detail-text">{{ selectedItem.summary }}</div>
          </div>

          <div v-if="selectedItem.keyPoints?.length" class="kb__detail-section">
            <div class="kb__detail-section-title">关键点</div>
            <ul class="kb__detail-list">
              <li v-for="point in selectedItem.keyPoints" :key="point">
                {{ point }}
              </li>
            </ul>
          </div>

          <div v-if="selectedItem.learningNotes" class="kb__detail-section">
            <div class="kb__detail-section-title">学习笔记</div>
            <div class="kb__detail-text">{{ selectedItem.learningNotes }}</div>
          </div>

          <div v-if="selectedItem.content" class="kb__detail-section">
            <div class="kb__detail-section-title">原文摘录</div>
            <div class="kb__detail-text kb__detail-text--content">
              {{ selectedItem.content.slice(0, 1500)
              }}{{ selectedItem.content.length > 1500 ? "…" : "" }}
            </div>
          </div>

          <div class="kb__detail-meta">
            <span>来源类型：{{ selectedItem.sourceType }}</span>
            <span>保存时间：{{ formatDate(selectedItem.createdAt) }}</span>
            <span v-if="selectedItem.siteName"
              >站点：{{ selectedItem.siteName }}</span
            >
          </div>
        </div>

        <div class="kb__detail-footer">
          <button
            v-if="selectedItem.aiStatus === 'failed'"
            class="kb__btn kb__btn--secondary"
            :disabled="isRetryingAi"
            @click="retryAi(selectedItem)">
            {{ isRetryingAi ? "处理中…" : "重试 AI 整理" }}
          </button>
          <button
            class="kb__btn kb__btn--secondary"
            @click="exportMarkdown(selectedItem)">
            导出 Markdown
          </button>
          <button
            class="kb__btn kb__btn--danger"
            :disabled="isDeleting"
            @click="deleteItem(selectedItem)">
            删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kb {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 0;
}

.kb__toolbar {
  display: flex;
  gap: 8px;
  padding: 12px 0 8px;
}

.kb__search {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid rgba(23, 32, 51, 0.15);
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
  font-family: inherit;
}

.kb__search:focus {
  border-color: #172033;
}

.kb__select {
  padding: 8px 10px;
  border: 1px solid rgba(23, 32, 51, 0.15);
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  background: #fff;
  font-family: inherit;
  cursor: pointer;
}

.kb__status {
  font-size: 12px;
  color: #627089;
  padding: 4px 0;
}

.kb__body {
  flex: 1;
  display: flex;
  gap: 16px;
  overflow: hidden;
  min-height: 0;
}

.kb__list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
  min-width: 0;
}

.kb__empty {
  text-align: center;
  padding: 48px 16px;
  color: #9ca3af;
  font-size: 13px;
  line-height: 1.8;
}

.kb__empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.kb__empty-hint {
  font-size: 12px;
  color: #c4c9d4;
  margin-top: 4px;
}

.kb__card {
  padding: 12px 14px;
  border: 1px solid rgba(23, 32, 51, 0.1);
  border-radius: 10px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
  background: #fff;
}

.kb__card:hover {
  border-color: rgba(23, 32, 51, 0.2);
  background: #fafbfc;
}

.kb__card--active {
  border-color: #172033;
  background: #fafbfc;
}

.kb__card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.kb__card-title {
  font-size: 13px;
  font-weight: 500;
  color: #172033;
  line-height: 1.4;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.kb__card-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.kb__card-summary {
  font-size: 12px;
  color: #627089;
  line-height: 1.5;
  margin-bottom: 8px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.kb__card-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.kb__card-time {
  font-size: 11px;
  color: #c4c9d4;
  margin-left: auto;
}

.kb__tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #f0f4ff;
  color: #4b6cb7;
}

.kb__tag--cat {
  background: #172033;
  color: #fff;
}

.kb__tag--error {
  background: #fee2e2;
  color: #dc2626;
}

.kb__icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 4px;
  border-radius: 4px;
  opacity: 0.6;
  transition:
    opacity 0.15s,
    background 0.15s;
}

.kb__icon-btn:hover {
  opacity: 1;
  background: rgba(23, 32, 51, 0.06);
}

.kb__icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.kb__icon-btn--danger:hover {
  background: #fee2e2;
}

/* Detail panel */
.kb__detail {
  width: 360px;
  flex-shrink: 0;
  border: 1px solid rgba(23, 32, 51, 0.1);
  border-radius: 10px;
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.kb__detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(23, 32, 51, 0.08);
}

.kb__detail-title {
  font-size: 14px;
  font-weight: 600;
  color: #172033;
  line-height: 1.4;
  flex: 1;
}

.kb__detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kb__detail-url {
  font-size: 11px;
  color: #627089;
  text-decoration: none;
  word-break: break-all;
}

.kb__detail-url:hover {
  text-decoration: underline;
}

.kb__detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.kb__detail-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kb__detail-section-title {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.kb__detail-text {
  font-size: 13px;
  color: #172033;
  line-height: 1.6;
}

.kb__detail-text--content {
  font-size: 12px;
  color: #627089;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
}

.kb__detail-list {
  font-size: 13px;
  color: #172033;
  padding-left: 16px;
  line-height: 1.8;
  margin: 0;
}

.kb__detail-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: #9ca3af;
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid rgba(23, 32, 51, 0.06);
}

.kb__detail-footer {
  display: flex;
  gap: 6px;
  padding: 10px 16px;
  border-top: 1px solid rgba(23, 32, 51, 0.08);
  flex-wrap: wrap;
}

.kb__btn {
  padding: 7px 12px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition:
    opacity 0.15s,
    background 0.15s;
}

.kb__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.kb__btn--secondary {
  background: #f6f8fb;
  color: #172033;
}

.kb__btn--secondary:hover:not(:disabled) {
  background: #e9ecf0;
}

.kb__btn--danger {
  background: #fee2e2;
  color: #dc2626;
}

.kb__btn--danger:hover:not(:disabled) {
  background: #fecaca;
}
</style>
