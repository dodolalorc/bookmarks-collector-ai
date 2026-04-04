<script setup lang="ts">
import { computed } from "vue"

import type { AiModelProfile, CapturedSnippet } from "../sdk/types"
import OverlaySnippetCard from "./OverlaySnippetCard.vue"

type OverlayStateView = {
  draft: {
    snippets: CapturedSnippet[]
  }
  sidebarOpen: boolean
  sidebarWidth: number
  aiDialogOpen: boolean
  elementPickMode: boolean
  status: string
  aiStatus: string
  aiConfigNotice: string
  aiConfigured: boolean
  bookmarkPromptVisible: boolean
  selectionText: string
  articleTitle: string
  articleUrl: string
  articleAuthor: string
  articleDate: string
  articleContent: string
  aiPrompt: string
  aiModelId: string
  aiModelLabel: string
  aiTokenEstimate: number
  aiCharCount: number
  aiRunning: boolean
  aiModels: AiModelProfile[]
  selectionAnchorVisible: boolean
  selectionAnchorHovered: boolean
  selectionAnchor: {
    top: number
    left: number
  }
}

const props = defineProps<{
  state: OverlayStateView
}>()

const emit = defineEmits<{
  toggleSidebar: []
  toggleAiDialog: []
  closeAiDialog: []
  startSidebarResize: [event: MouseEvent]
  captureSelection: []
  toggleElementMode: []
  deleteSnippet: [snippetId: string]
  analyzeSnippet: [snippetId: string]
  analyzeAllSnippets: []
  reanalyzeAllSnippets: []
  openOptions: []
  openHistory: []
  openQuickStart: []
  openGithub: []
  refreshArticle: []
  updateArticleMeta: [
    payload: {
      title?: string
      url?: string
      author?: string
      date?: string
      content?: string
      prompt?: string
      modelId?: string
    }
  ]
  summarizeArticle: []
  classifyNow: []
  dismissBookmarkPrompt: []
  showSelectionPrompt: []
  hideSelectionPrompt: []
}>()

const FLOATING_BALL_TOP = 84
const FLOATING_BALL_GAP = 14
const FLOATING_BALL_SIZE = 38

const pageEdgeOffset = computed(() =>
  props.state.sidebarOpen ? props.state.sidebarWidth + 20 : 20
)

const promptRight = computed(() => `${pageEdgeOffset.value + 52}px`)

const sidebarBallStyle = computed(() => ({
  right: `${pageEdgeOffset.value}px`,
  top: `${FLOATING_BALL_TOP}px`
}))

const aiBallStyle = computed(() => ({
  right: `${pageEdgeOffset.value}px`,
  top: `${FLOATING_BALL_TOP + FLOATING_BALL_SIZE + FLOATING_BALL_GAP}px`
}))

const selectionPromptStyle = computed(() => ({
  top: `${props.state.selectionAnchor.top + 22}px`,
  left: `${props.state.selectionAnchor.left - 52}px`
}))

const selectionDotStyle = computed(() => ({
  top: `${props.state.selectionAnchor.top}px`,
  left: `${props.state.selectionAnchor.left}px`
}))

const aiMetaSummary = computed(() => [
  { label: "字符", value: props.state.aiCharCount.toLocaleString() },
  { label: "预估 Token", value: props.state.aiTokenEstimate.toLocaleString() },
  { label: "模型", value: props.state.aiModelLabel || "未配置模型" }
])

const onTextInput =
  (key: "title" | "url" | "author" | "date" | "content" | "prompt") =>
  (event: Event) => {
    const target = event.target
    if (
      !(target instanceof HTMLInputElement) &&
      !(target instanceof HTMLTextAreaElement)
    ) {
      return
    }

    emit("updateArticleMeta", {
      [key]: target.value
    })
  }

const onModelChange = (event: Event) => {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) {
    return
  }

  emit("updateArticleMeta", {
    modelId: target.value
  })
}
</script>

<template>
  <div class="overlay-root">
    <div
      v-if="state.bookmarkPromptVisible"
      class="prompt"
      :style="{ right: promptRight }">
      <div class="prompt-title">检测到你收藏了当前页面</div>
      <div class="prompt-text">要不要现在整理标签，并补充当前页面里的知识片段？</div>
      <div class="prompt-actions">
        <button class="chip chip-gradient" @click="emit('classifyNow')">
          <font-awesome-icon icon="bolt" />
          立即处理
        </button>
        <button class="chip" @click="emit('dismissBookmarkPrompt')">
          <font-awesome-icon icon="clock" />
          稍后
        </button>
      </div>
    </div>

    <div
      v-if="state.selectionAnchorVisible"
      class="selection-anchor-wrap"
      :style="selectionDotStyle"
      @mouseenter="emit('showSelectionPrompt')"
      @mouseleave="emit('hideSelectionPrompt')">
      <button class="selection-anchor" title="将选中文本加入当前知识片段">
        <span class="selection-anchor-core"></span>
      </button>
      <div
        v-if="state.selectionAnchorHovered"
        class="selection-anchor-pop"
        :style="selectionPromptStyle">
        <div class="selection-anchor-title">加入当前抓取面板</div>
        <div class="selection-anchor-copy">选中文本后，这个按钮会出现在选择区域末尾，方便直接加入当前页面草稿。</div>
        <button class="chip chip-gradient" @click="emit('captureSelection')">
          <font-awesome-icon icon="highlighter" />
          选择加入
        </button>
      </div>
    </div>

    <button
      class="floating-ball"
      :style="sidebarBallStyle"
      title="打开页面知识抓取面板"
      @click.stop="emit('toggleSidebar')">
      <font-awesome-icon icon="wand-magic-sparkles" />
    </button>

    <button
      class="floating-ball floating-ball-ai"
      :style="aiBallStyle"
      title="打开 AI 页面整理弹窗"
      @click.stop="emit('toggleAiDialog')">
      <font-awesome-icon icon="brain" />
    </button>

    <aside
      class="page-sidebar"
      :class="{ open: state.sidebarOpen }"
      :style="{ width: `${state.sidebarWidth}px` }">
      <button
        class="resize-handle"
        title="拖动调整宽度"
        @mousedown.prevent="emit('startSidebarResize', $event)" />

      <div class="sidebar-head">
        <div class="sidebar-title-wrap">
          <div class="sidebar-eyebrow">Page Capture</div>
          <div class="sidebar-title">页面知识抓取</div>
          <div class="sidebar-subtitle">
            这里像浏览器侧边工具一样嵌入页面右侧。打开后会为页面预留宽度，避免直接遮挡正文。
          </div>
        </div>
        <button class="icon-button" @click="emit('toggleSidebar')">
          <font-awesome-icon icon="xmark" />
        </button>
      </div>

      <div class="sidebar-status">{{ state.status }}</div>

      <div class="toolbar">
        <button class="chip chip-gradient" @click="emit('captureSelection')">
          <font-awesome-icon icon="highlighter" />
          抓取当前选中
        </button>
        <button class="chip" @click="emit('toggleElementMode')">
          <font-awesome-icon icon="vector-square" />
          {{ state.elementPickMode ? "退出框选模式" : "开启框选模式" }}
        </button>
        <button class="chip" @click="emit('analyzeAllSnippets')">
          <font-awesome-icon icon="wand-magic-sparkles" />
          分析全部
        </button>
        <button class="chip" @click="emit('reanalyzeAllSnippets')">
          <font-awesome-icon icon="arrows-rotate" />
          重新分析
        </button>
      </div>

      <div v-if="state.selectionText" class="selection-panel">
        <div class="selection-label">Current Selection</div>
        <div class="selection-text">
          {{ state.selectionText.slice(0, 280) }}
        </div>
      </div>

      <div class="snippet-list">
        <div v-if="state.draft.snippets.length === 0" class="empty-state">
          这里会展示当前页面抓取到的知识片段。你可以先选中文本直接加入，也可以开启框选模式抓取页面某个区域。
        </div>
        <OverlaySnippetCard
          v-for="snippet in state.draft.snippets"
          :key="snippet.id"
          :snippet="snippet"
          @analyze="emit('analyzeSnippet', $event)"
          @delete="emit('deleteSnippet', $event)" />
      </div>

      <div class="sidebar-footer">
        <div class="footer-text">模型配置、历史整理和快速开始都在管理页里</div>
        <div class="footer-actions">
          <button class="icon-button" title="快速开始" @click="emit('openQuickStart')">
            <font-awesome-icon icon="book-open" />
          </button>
          <button class="icon-button" title="模型配置" @click="emit('openOptions')">
            <font-awesome-icon icon="gear" />
          </button>
          <button class="icon-button" title="历史整理" @click="emit('openHistory')">
            <font-awesome-icon icon="bookmark" />
          </button>
          <button class="icon-button" title="GitHub" @click="emit('openGithub')">
            <font-awesome-icon icon="up-right-from-square" />
          </button>
        </div>
      </div>
    </aside>

    <div
      v-if="state.aiDialogOpen"
      class="ai-dialog-backdrop"
      @click="emit('closeAiDialog')" />

    <section
      v-if="state.aiDialogOpen"
      class="ai-dialog"
      @click.stop>
      <div class="ai-panel-head">
        <div>
          <div class="sidebar-eyebrow">Page Digest</div>
          <div class="sidebar-title">AI 页面整理</div>
          <div class="sidebar-subtitle">
            这里改成独立弹窗，不再和页面知识抓取共用侧边抽屉。适合集中整理当前页面内容。
          </div>
        </div>
        <div class="panel-actions">
          <button class="icon-button" title="刷新页面抓取" @click="emit('refreshArticle')">
            <font-awesome-icon icon="rotate-right" />
          </button>
          <button class="icon-button" title="模型配置" @click="emit('openOptions')">
            <font-awesome-icon icon="gear" />
          </button>
          <button class="icon-button" title="关闭弹窗" @click="emit('closeAiDialog')">
            <font-awesome-icon icon="xmark" />
          </button>
        </div>
      </div>

      <div class="ai-panel-body">
        <div class="sidebar-status">{{ state.aiStatus }}</div>

        <div v-if="state.aiConfigNotice" class="config-notice">
          {{ state.aiConfigNotice }}
        </div>

        <div class="meta-grid">
          <label class="field-wrap">
            <span class="field-label">标题</span>
            <input class="field" :value="state.articleTitle" @input="onTextInput('title')" />
          </label>
          <label class="field-wrap">
            <span class="field-label">作者</span>
            <input class="field" :value="state.articleAuthor" @input="onTextInput('author')" />
          </label>
          <label class="field-wrap">
            <span class="field-label">日期</span>
            <input class="field" :value="state.articleDate" @input="onTextInput('date')" />
          </label>
          <label class="field-wrap field-wrap-wide">
            <span class="field-label">网址</span>
            <input class="field" :value="state.articleUrl" @input="onTextInput('url')" />
          </label>
        </div>

        <div class="field-wrap">
          <div class="field-row">
            <span class="field-label">文章主要内容</span>
            <div class="field-stats">
              <span
                v-for="item in aiMetaSummary"
                :key="item.label"
                class="stat-pill">
                {{ item.label }} {{ item.value }}
              </span>
            </div>
          </div>
          <textarea
            class="field textarea-large"
            :value="state.articleContent"
            @input="onTextInput('content')" />
        </div>

        <div class="field-wrap">
          <span class="field-label">AI 提示语</span>
          <textarea
            class="field textarea-prompt"
            :value="state.aiPrompt"
            placeholder="补充你希望 AI 以什么视角整理页面，例如：保留关键论点并输出成技术笔记。"
            @input="onTextInput('prompt')" />
        </div>

        <div class="field-row action-row">
          <label class="field-wrap model-select-wrap">
            <span class="field-label">模型选择</span>
            <div class="select-shell">
              <select class="field select-field" :value="state.aiModelId" @change="onModelChange">
                <option
                  v-for="model in state.aiModels"
                  :key="model.id"
                  :value="model.id">
                  {{ model.label }}{{ model.model ? ` · ${model.model}` : "" }}
                </option>
              </select>
              <font-awesome-icon icon="chevron-down" class="select-arrow" />
            </div>
          </label>

          <div class="bar-actions">
            <button class="chip" @click="emit('openQuickStart')">
              <font-awesome-icon icon="book-open" />
              快速开始
            </button>
            <button class="chip" @click="emit('openOptions')">
              <font-awesome-icon icon="gear" />
              模型配置
            </button>
            <button
              class="chip chip-gradient"
              :disabled="state.aiRunning || !state.aiConfigured"
              @click="emit('summarizeArticle')">
              <font-awesome-icon icon="robot" />
              {{ state.aiRunning ? "整理中" : "一键总结" }}
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.overlay-root {
  all: initial;
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147483646;
  font-family: var(--sf-font-family);
}

.prompt {
  position: fixed;
  top: 86px;
  pointer-events: auto;
  max-width: 260px;
  border-radius: var(--sf-radius-lg);
  padding: var(--sf-space-3) var(--sf-space-3) var(--sf-space-2);
  background: linear-gradient(135deg, #fff9ff 0%, #f4fbff 55%, #edf8ff 100%);
  border: 1px solid rgba(132, 174, 224, 0.24);
  box-shadow: 0 18px 34px rgba(93, 118, 164, 0.18);
}

.prompt-title {
  font-size: var(--sf-font-size-md);
  font-weight: 800;
  color: #2b3962;
  margin-bottom: 6px;
}

.prompt-text {
  font-size: var(--sf-font-size-sm);
  line-height: var(--sf-line-height-relaxed);
  color: #6d7994;
  margin-bottom: 10px;
}

.prompt-actions,
.footer-actions,
.panel-actions,
.bar-actions {
  display: flex;
  gap: var(--sf-space-2);
  align-items: center;
  flex-wrap: wrap;
}

.floating-ball {
  --ball-size: 38px;
  position: fixed;
  pointer-events: auto;
  z-index: 2147483647;
  width: var(--ball-size);
  height: var(--ball-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.96);
  outline: 1px solid rgba(74, 107, 164, 0.52);
  background: radial-gradient(circle at 30% 30%, #ffe1f5 0%, #b9ecff 42%, #6c95ff 100%);
  box-shadow:
    0 10px 24px rgba(57, 93, 156, 0.4),
    0 0 0 3px rgba(168, 216, 255, 0.22);
  cursor: pointer;
}

.floating-ball-ai {
  background: radial-gradient(circle at 30% 30%, #fff0c7 0%, #ffd27f 34%, #ff8c42 100%);
}

.selection-anchor-wrap {
  position: fixed;
  pointer-events: auto;
  z-index: 2147483647;
}

.selection-anchor {
  position: absolute;
  width: 18px;
  height: 18px;
  border: 0;
  border-radius: 999px;
  padding: 0;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, #ff7ecb 0%, #7db6ff 100%);
  box-shadow:
    0 6px 16px rgba(87, 114, 193, 0.3),
    0 0 0 3px rgba(255, 255, 255, 0.92);
  cursor: pointer;
}

.selection-anchor-core {
  display: block;
  width: 8px;
  height: 8px;
  margin: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.95);
}

.selection-anchor-pop {
  position: absolute;
  width: 200px;
  border-radius: 16px;
  padding: 12px;
  background: linear-gradient(180deg, #fff8ff 0%, #f4fbff 100%);
  border: 1px solid rgba(137, 175, 233, 0.24);
  box-shadow: 0 18px 34px rgba(85, 106, 155, 0.2);
}

.selection-anchor-title {
  font-size: 13px;
  font-weight: 800;
  color: #30436d;
}

.selection-anchor-copy {
  margin: 6px 0 10px;
  font-size: 12px;
  line-height: 1.6;
  color: #6d7994;
}

.page-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  transform: translateX(100%);
  transition: transform 220ms ease;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(
    180deg,
    rgba(255, 249, 255, 0.99) 0%,
    rgba(244, 250, 255, 0.99) 42%,
    rgba(238, 247, 255, 0.99) 100%
  );
  border-left: 1px solid rgba(136, 176, 224, 0.26);
  box-shadow: -24px 0 48px rgba(75, 105, 150, 0.22);
  backdrop-filter: blur(18px);
}

.page-sidebar.open {
  transform: translateX(0);
}

.resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 10px;
  margin-left: -5px;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: ew-resize;
}

.resize-handle::before {
  content: "";
  position: absolute;
  left: 4px;
  top: 24px;
  bottom: 24px;
  width: 2px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(108, 149, 255, 0.08), rgba(108, 149, 255, 0.48), rgba(108, 149, 255, 0.08));
}

.sidebar-head,
.ai-panel-head {
  padding: var(--sf-space-4) var(--sf-space-4) var(--sf-space-3);
  border-bottom: 1px solid rgba(136, 176, 224, 0.14);
  background: linear-gradient(
    135deg,
    rgba(255, 217, 244, 0.58) 0%,
    rgba(213, 243, 255, 0.68) 65%,
    rgba(240, 248, 255, 0.76) 100%
  );
  display: flex;
  justify-content: space-between;
  gap: var(--sf-space-3);
}

.ai-panel-head {
  background: linear-gradient(
    135deg,
    rgba(255, 233, 176, 0.76) 0%,
    rgba(255, 246, 228, 0.82) 52%,
    rgba(241, 248, 255, 0.82) 100%
  );
}

.sidebar-eyebrow {
  font-size: var(--sf-font-size-xs);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7d88b1;
  font-weight: 800;
}

.sidebar-title {
  font-size: var(--sf-font-size-xl);
  line-height: 1.05;
  font-weight: 900;
  color: #25324d;
  margin-top: var(--sf-space-1);
}

.sidebar-subtitle {
  font-size: var(--sf-font-size-sm);
  line-height: var(--sf-line-height-relaxed);
  color: #6e7997;
  margin-top: var(--sf-space-2);
}

.sidebar-status {
  padding: var(--sf-space-3) var(--sf-space-4) 0;
  font-size: var(--sf-font-size-sm);
  line-height: var(--sf-line-height-relaxed);
  color: #65728f;
}

.toolbar {
  padding: var(--sf-space-4) var(--sf-space-4) 0;
  display: flex;
  gap: var(--sf-space-2);
  flex-wrap: wrap;
}

.chip {
  border: 0;
  border-radius: 999px;
  min-height: var(--sf-button-height);
  padding: 0 var(--sf-space-3);
  background: #eef4ff;
  color: #657899;
  font-size: var(--sf-font-size-xs);
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--sf-space-1);
}

.chip:disabled,
.icon-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.chip-gradient {
  background: linear-gradient(135deg, #ff8ed8 0%, #8ad8ff 100%);
  color: #21304f;
}

.icon-button {
  border: 0;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #516890;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.selection-panel {
  margin: var(--sf-space-3) var(--sf-space-4) 0;
  border-radius: var(--sf-radius-lg);
  padding: var(--sf-space-3);
  background: linear-gradient(135deg, #fff1fa 0%, #eef9ff 100%);
  border: 1px solid rgba(150, 195, 235, 0.18);
}

.selection-label,
.field-label {
  font-size: var(--sf-font-size-xs);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7c86ad;
}

.selection-text {
  margin-top: var(--sf-space-1);
  font-size: var(--sf-font-size-sm);
  line-height: 1.65;
  color: #31415f;
}

.snippet-list,
.ai-panel-body {
  padding: var(--sf-space-3) var(--sf-space-4) var(--sf-space-4);
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: var(--sf-space-3);
  flex: 1;
}

.empty-state {
  border-radius: var(--sf-radius-xl);
  padding: var(--sf-space-4);
  background: rgba(255, 255, 255, 0.7);
  border: 1px dashed rgba(126, 169, 220, 0.28);
  font-size: var(--sf-font-size-sm);
  line-height: 1.7;
  color: #72809e;
}

.sidebar-footer {
  padding: var(--sf-space-3) var(--sf-space-4) var(--sf-space-4);
  border-top: 1px solid rgba(136, 176, 224, 0.12);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sf-space-2);
}

.footer-text {
  font-size: var(--sf-font-size-xs);
  color: #8591ac;
}

.ai-dialog-backdrop {
  position: fixed;
  inset: 0;
  pointer-events: auto;
  background: rgba(37, 50, 77, 0.24);
  backdrop-filter: blur(4px);
}

.ai-dialog {
  position: fixed;
  top: 48px;
  left: 50%;
  transform: translateX(-50%);
  width: min(820px, calc(100vw - 64px));
  max-height: calc(100vh - 96px);
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 28px;
  background: linear-gradient(
    180deg,
    rgba(255, 251, 240, 0.99) 0%,
    rgba(255, 246, 231, 0.99) 36%,
    rgba(247, 251, 255, 0.99) 100%
  );
  border: 1px solid rgba(236, 203, 120, 0.22);
  box-shadow: 0 30px 80px rgba(75, 105, 150, 0.26);
}

.config-notice {
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 248, 228, 0.88);
  border: 1px solid rgba(232, 188, 92, 0.26);
  color: #7a5a18;
  line-height: 1.7;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sf-space-3);
}

.field-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--sf-space-1);
}

.field-wrap-wide {
  grid-column: 1 / -1;
}

.field-row {
  display: flex;
  justify-content: space-between;
  gap: var(--sf-space-2);
  align-items: center;
}

.field-stats {
  display: flex;
  gap: var(--sf-space-2);
  flex-wrap: wrap;
  justify-content: flex-end;
}

.stat-pill {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.74);
  color: #586781;
  font-size: 12px;
  font-weight: 700;
}

.field,
.select-field {
  width: 100%;
  min-height: 40px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(147, 168, 197, 0.44);
  background: rgba(255, 255, 255, 0.82);
  color: #20304c;
  box-sizing: border-box;
}

.textarea-large {
  min-height: 280px;
  resize: vertical;
  line-height: 1.7;
}

.textarea-prompt {
  min-height: 92px;
  resize: vertical;
  line-height: 1.6;
}

.action-row {
  align-items: flex-end;
  flex-wrap: wrap;
}

.model-select-wrap {
  min-width: 240px;
  flex: 1;
}

.select-shell {
  position: relative;
}

.select-field {
  appearance: none;
  padding-right: 34px;
}

.select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #7686a1;
  pointer-events: none;
}

@media (max-width: 860px) {
  .meta-grid {
    grid-template-columns: 1fr;
  }

  .ai-dialog {
    top: 16px;
    width: calc(100vw - 24px);
    max-height: calc(100vh - 32px);
  }
}
</style>
