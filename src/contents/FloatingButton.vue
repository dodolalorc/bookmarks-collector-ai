<template>
  <div v-if="!hidden" class="kc-float-root">
    <!-- 主悬浮球 -->
    <div
      class="kc-ball"
      :class="{ 'kc-ball--open': menuOpen, 'kc-ball--saving': isSaving }"
      @click="handleBallClick"
      @contextmenu.prevent="toggleMenu"
      title="保存到知识库">
      <span v-if="isSaving" class="kc-ball__spinner">⏳</span>
      <span v-else-if="saveSuccess" class="kc-ball__icon">✓</span>
      <span v-else class="kc-ball__icon">📚</span>
    </div>

    <!-- 展开菜单 -->
    <Transition name="kc-menu">
      <div v-if="menuOpen" class="kc-menu">
        <button class="kc-menu__item" @click="quickSave">
          <span class="kc-menu__icon">⚡</span>快速保存
        </button>
        <button class="kc-menu__item" @click="deepSave">
          <span class="kc-menu__icon">🔍</span>深度保存
        </button>
        <button
          class="kc-menu__item"
          @click="saveSelection"
          :disabled="!hasSelection">
          <span class="kc-menu__icon">✂️</span>保存选中文本
        </button>
        <button class="kc-menu__item" @click="openKnowledgeBase">
          <span class="kc-menu__icon">📖</span>打开知识库
        </button>
      </div>
    </Transition>

    <!-- 深度保存面板 -->
    <Transition name="kc-panel">
      <div v-if="panelOpen" class="kc-panel">
        <div class="kc-panel__header">
          <div class="kc-panel__title">深度保存</div>
          <button class="kc-panel__close" @click="closePanel">✕</button>
        </div>

        <div class="kc-panel__body">
          <div class="kc-field">
            <label class="kc-label">标题</label>
            <input v-model="editTitle" class="kc-input" type="text" />
          </div>
          <div class="kc-field">
            <label class="kc-label">摘要</label>
            <textarea
              v-model="editSummary"
              class="kc-textarea"
              rows="3"></textarea>
          </div>
          <div class="kc-field">
            <label class="kc-label">标签（逗号分隔）</label>
            <input
              v-model="editTagsStr"
              class="kc-input"
              type="text"
              placeholder="标签1, 标签2" />
          </div>
          <div class="kc-field">
            <label class="kc-label">分类</label>
            <select v-model="editCategory" class="kc-select">
              <option v-for="cat in categories" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
          </div>
          <div
            v-if="aiStatus"
            class="kc-status"
            :class="{ 'kc-status--error': aiError }">
            {{ aiStatus }}
          </div>
        </div>

        <div class="kc-panel__footer">
          <button
            class="kc-btn kc-btn--secondary"
            @click="regenAi"
            :disabled="isAiRunning">
            {{ isAiRunning ? "生成中…" : "重新生成" }}
          </button>
          <button
            class="kc-btn kc-btn--primary"
            @click="confirmDeepSave"
            :disabled="isSaving">
            {{ isSaving ? "保存中…" : "保存到知识库" }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- Toast 提示 -->
    <Transition name="kc-toast">
      <div
        v-if="toastMsg"
        class="kc-toast"
        :class="{ 'kc-toast--error': toastError }">
        {{ toastMsg }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue"

import { KNOWLEDGE_CATEGORIES } from "../types/knowledge"

const hidden = ref(false)
const menuOpen = ref(false)
const panelOpen = ref(false)
const isSaving = ref(false)
const isAiRunning = ref(false)
const saveSuccess = ref(false)
const hasSelection = ref(false)
const toastMsg = ref("")
const toastError = ref(false)
const aiStatus = ref("")
const aiError = ref(false)

const editTitle = ref("")
const editSummary = ref("")
const editTagsStr = ref("")
const editCategory = ref("其他")

const categories = KNOWLEDGE_CATEGORIES

const selectionText = ref("")

// 监听文字选中
function onSelectionChange() {
  const text = window.getSelection()?.toString().trim() ?? ""
  selectionText.value = text
  hasSelection.value = text.length > 0
}

onMounted(() => {
  document.addEventListener("selectionchange", onSelectionChange)
})

onUnmounted(() => {
  document.removeEventListener("selectionchange", onSelectionChange)
})

function handleBallClick() {
  if (menuOpen.value) {
    menuOpen.value = false
  } else {
    quickSave()
  }
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

function closePanel() {
  panelOpen.value = false
}

async function sendMessage<T>(type: string, payload?: unknown): Promise<T> {
  const response = await chrome.runtime.sendMessage({ type, payload })
  if (!response?.ok) {
    throw new Error(response?.error ?? "操作失败")
  }
  return response.payload as T
}

function showToast(msg: string, isError = false, duration = 3000) {
  toastMsg.value = msg
  toastError.value = isError
  setTimeout(() => {
    toastMsg.value = ""
  }, duration)
}

async function quickSave() {
  closeMenu()
  if (isSaving.value) return
  isSaving.value = true

  try {
    showToast("正在抓取网页…")
    await sendMessage("knowledge/quick-save", {
      sourceType: "page"
    })
    saveSuccess.value = true
    showToast("✓ 已保存到知识库")
    setTimeout(() => {
      saveSuccess.value = false
    }, 3000)
  } catch (e) {
    showToast(e instanceof Error ? e.message : "保存失败，请重试", true)
  } finally {
    isSaving.value = false
  }
}

async function deepSave() {
  closeMenu()
  editTitle.value = document.title || ""
  editSummary.value = ""
  editTagsStr.value = ""
  editCategory.value = "其他"
  aiStatus.value = "正在生成 AI 摘要…"
  aiError.value = false
  panelOpen.value = true

  // 异步请求 AI 元数据
  isAiRunning.value = true
  try {
    const result = await sendMessage<{
      summary: string
      tags: string[]
      category: string
    }>("knowledge/generate-quick-meta")
    editSummary.value = result.summary
    editTagsStr.value = result.tags.join(", ")
    editCategory.value = result.category
    aiStatus.value = ""
  } catch (e) {
    aiStatus.value = e instanceof Error ? e.message : "AI 生成失败，可手动填写"
    aiError.value = true
  } finally {
    isAiRunning.value = false
  }
}

async function regenAi() {
  if (isAiRunning.value) return
  aiStatus.value = "正在重新生成…"
  aiError.value = false
  isAiRunning.value = true
  try {
    const result = await sendMessage<{
      summary: string
      tags: string[]
      category: string
    }>("knowledge/generate-quick-meta")
    editSummary.value = result.summary
    editTagsStr.value = result.tags.join(", ")
    editCategory.value = result.category
    aiStatus.value = ""
  } catch (e) {
    aiStatus.value = e instanceof Error ? e.message : "AI 生成失败"
    aiError.value = true
  } finally {
    isAiRunning.value = false
  }
}

async function confirmDeepSave() {
  if (isSaving.value) return
  isSaving.value = true
  try {
    const tags = editTagsStr.value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    await sendMessage("knowledge/save-with-meta", {
      title: editTitle.value,
      summary: editSummary.value,
      tags,
      category: editCategory.value,
      sourceType: "page"
    })
    panelOpen.value = false
    showToast("✓ 已保存到知识库")
  } catch (e) {
    showToast(e instanceof Error ? e.message : "保存失败", true)
  } finally {
    isSaving.value = false
  }
}

async function saveSelection() {
  closeMenu()
  if (!selectionText.value) {
    showToast("请先在页面上选中一段文字", true)
    return
  }
  isSaving.value = true
  try {
    await sendMessage("knowledge/save-selection", {
      selectedText: selectionText.value
    })
    showToast("✓ 选中内容已保存")
  } catch (e) {
    showToast(e instanceof Error ? e.message : "保存失败", true)
  } finally {
    isSaving.value = false
  }
}

function openKnowledgeBase() {
  closeMenu()
  chrome.runtime.sendMessage({ type: "knowledge/open-knowledge-base" })
}
</script>

<style scoped>
.kc-float-root {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 2147483640;
  font-family: "SF Pro Text", "Segoe UI", "PingFang SC", sans-serif;
  font-size: 13px;
}

.kc-ball {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #172033;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(23, 32, 51, 0.3);
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  user-select: none;
}

.kc-ball:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 20px rgba(23, 32, 51, 0.4);
}

.kc-ball--saving {
  background: #6b7280;
}

.kc-ball__icon {
  font-size: 18px;
  line-height: 1;
}

.kc-menu {
  position: absolute;
  right: 52px;
  bottom: 0;
  background: #fff;
  border: 1px solid rgba(23, 32, 51, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(23, 32, 51, 0.15);
  padding: 6px 0;
  min-width: 160px;
  overflow: hidden;
}

.kc-menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 14px;
  background: none;
  border: none;
  font-size: 13px;
  color: #172033;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.kc-menu__item:hover {
  background: #f6f8fb;
}

.kc-menu__item:disabled {
  color: #9ca3af;
  cursor: not-allowed;
}

.kc-menu__icon {
  font-size: 14px;
}

.kc-panel {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  width: 360px;
  max-height: 80vh;
  background: #fff;
  border: 1px solid rgba(23, 32, 51, 0.1);
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(23, 32, 51, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.kc-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(23, 32, 51, 0.08);
}

.kc-panel__title {
  font-size: 15px;
  font-weight: 600;
  color: #172033;
}

.kc-panel__close {
  background: none;
  border: none;
  font-size: 16px;
  color: #9ca3af;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
  transition: background 0.15s;
}

.kc-panel__close:hover {
  background: #f6f8fb;
  color: #172033;
}

.kc-panel__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kc-panel__footer {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid rgba(23, 32, 51, 0.08);
  justify-content: flex-end;
}

.kc-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kc-label {
  font-size: 12px;
  font-weight: 500;
  color: #627089;
}

.kc-input,
.kc-textarea,
.kc-select {
  padding: 8px 10px;
  border: 1px solid rgba(23, 32, 51, 0.15);
  border-radius: 8px;
  font-size: 13px;
  color: #172033;
  background: #fff;
  outline: none;
  transition: border-color 0.15s;
  font-family: inherit;
  resize: vertical;
}

.kc-input:focus,
.kc-textarea:focus,
.kc-select:focus {
  border-color: #172033;
}

.kc-status {
  font-size: 12px;
  color: #627089;
  padding: 6px 0;
}

.kc-status--error {
  color: #dc2626;
}

.kc-btn {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s;
  font-family: inherit;
}

.kc-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.kc-btn--primary {
  background: #172033;
  color: #fff;
}

.kc-btn--primary:hover:not(:disabled) {
  opacity: 0.85;
}

.kc-btn--secondary {
  background: #f6f8fb;
  color: #172033;
}

.kc-btn--secondary:hover:not(:disabled) {
  background: #e9ecf0;
}

.kc-toast {
  position: absolute;
  bottom: 54px;
  right: 0;
  background: #172033;
  color: #fff;
  font-size: 12px;
  padding: 8px 14px;
  border-radius: 10px;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(23, 32, 51, 0.2);
}

.kc-toast--error {
  background: #dc2626;
}

/* Transitions */
.kc-menu-enter-active,
.kc-menu-leave-active {
  transition:
    opacity 0.15s,
    transform 0.15s;
}
.kc-menu-enter-from,
.kc-menu-leave-to {
  opacity: 0;
  transform: translateX(8px);
}

.kc-panel-enter-active,
.kc-panel-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.kc-panel-enter-from,
.kc-panel-leave-to {
  opacity: 0;
  transform: translateY(-50%) translateX(20px);
}

.kc-toast-enter-active,
.kc-toast-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.kc-toast-enter-from,
.kc-toast-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
