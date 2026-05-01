<script setup lang="ts">
import { onMounted, ref } from "vue"

async function sendMessage<T>(type: string, payload?: unknown): Promise<T> {
  const response = await chrome.runtime.sendMessage({ type, payload })
  if (!response?.ok) throw new Error(response?.error ?? "操作失败")
  return response.payload as T
}

interface RecentItem {
  id: string
  title: string
  url: string
  category: string
  createdAt: number
}

const todayCount = ref(0)
const recentItems = ref<RecentItem[]>([])
const isLoading = ref(true)

onMounted(async () => {
  try {
    const [count, items] = await Promise.all([
      sendMessage<number>("knowledge/get-today-count"),
      sendMessage<RecentItem[]>("knowledge/get-recent", { limit: 3 })
    ])
    todayCount.value = count
    recentItems.value = items
  } catch {
    // ignore - not yet configured
  } finally {
    isLoading.value = false
  }
})

function openKnowledgeBase() {
  chrome.runtime.sendMessage({ type: "knowledge/open-knowledge-base" })
}

function openHistory() {
  chrome.tabs.create({ url: chrome.runtime.getURL("options.html#history") })
}

function openSettings() {
  chrome.tabs.create({ url: chrome.runtime.getURL("options.html#settings") })
}

function formatTime(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "刚刚"
  if (diffMin < 60) return `${diffMin} 分钟前`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH} 小时前`
  return `${Math.floor(diffH / 24)} 天前`
}
</script>

<template>
  <div class="popup">
    <!-- 头部 -->
    <div class="popup__header">
      <div class="popup__logo">📚</div>
      <div>
        <div class="popup__title">知识库</div>
        <div class="popup__subtitle">本地优先的网页知识采集工具</div>
      </div>
    </div>

    <!-- 今日统计 -->
    <div class="popup__stat">
      <div class="popup__stat-number">{{ isLoading ? "–" : todayCount }}</div>
      <div class="popup__stat-label">今日已保存</div>
    </div>

    <!-- 最近保存 -->
    <div class="popup__section">
      <div class="popup__section-title">最近保存</div>
      <div v-if="isLoading" class="popup__empty">加载中…</div>
      <div v-else-if="recentItems.length === 0" class="popup__empty">
        还没有保存任何内容。<br />
        <span class="popup__empty-hint"
          >在网页右下角点击悬浮按钮开始保存。</span
        >
      </div>
      <div v-else class="popup__recent-list">
        <a
          v-for="item in recentItems"
          :key="item.id"
          :href="item.url"
          target="_blank"
          class="popup__recent-item">
          <div class="popup__recent-title" :title="item.title">
            {{ item.title || "无标题" }}
          </div>
          <div class="popup__recent-meta">
            <span class="popup__recent-cat">{{ item.category }}</span>
            <span class="popup__recent-time">{{
              formatTime(item.createdAt)
            }}</span>
          </div>
        </a>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="popup__actions">
      <button class="popup__btn popup__btn--primary" @click="openKnowledgeBase">
        📖 打开知识库
      </button>
      <button class="popup__btn popup__btn--secondary" @click="openHistory">
        🗂️ 历史书签整理
      </button>
      <button class="popup__btn popup__btn--secondary" @click="openSettings">
        ⚙️ 设置
      </button>
    </div>
  </div>
</template>

<style scoped>
.popup {
  width: 300px;
  min-height: 360px;
  background: #fff;
  font-family: "SF Pro Text", "Segoe UI", "PingFang SC", sans-serif;
  color: #172033;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.popup__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 16px 12px;
  border-bottom: 1px solid rgba(23, 32, 51, 0.08);
}

.popup__logo {
  font-size: 24px;
  line-height: 1;
}

.popup__title {
  font-size: 15px;
  font-weight: 600;
  color: #172033;
  line-height: 1.3;
}

.popup__subtitle {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
}

.popup__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 16px 16px;
  border-bottom: 1px solid rgba(23, 32, 51, 0.06);
}

.popup__stat-number {
  font-size: 36px;
  font-weight: 700;
  color: #172033;
  line-height: 1;
}

.popup__stat-label {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}

.popup__section {
  flex: 1;
  padding: 12px 16px;
}

.popup__section-title {
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.popup__empty {
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
  padding: 12px 0;
  line-height: 1.6;
}

.popup__empty-hint {
  font-size: 11px;
  color: #c4c9d4;
}

.popup__recent-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.popup__recent-item {
  display: block;
  padding: 8px 10px;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: background 0.15s;
}

.popup__recent-item:hover {
  background: #f6f8fb;
}

.popup__recent-title {
  font-size: 13px;
  color: #172033;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.popup__recent-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.popup__recent-cat {
  font-size: 11px;
  background: #f0f4ff;
  color: #4b6cb7;
  padding: 1px 6px;
  border-radius: 4px;
}

.popup__recent-time {
  font-size: 11px;
  color: #c4c9d4;
}

.popup__actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 16px 16px;
  border-top: 1px solid rgba(23, 32, 51, 0.08);
}

.popup__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition:
    opacity 0.15s,
    background 0.15s;
  text-align: center;
}

.popup__btn--primary {
  background: #172033;
  color: #fff;
}

.popup__btn--primary:hover {
  opacity: 0.85;
}

.popup__btn--secondary {
  background: #f6f8fb;
  color: #172033;
}

.popup__btn--secondary:hover {
  background: #e9ecf0;
}
</style>
