<script setup lang="ts">
import { computed } from "vue"

import type { CapturedSnippet } from "../sdk/types"
import OverlaySnippetCard from "./OverlaySnippetCard.vue"

type OverlayStateView = {
  draft: {
    snippets: CapturedSnippet[]
  }
  sidebarOpen: boolean
  elementPickMode: boolean
  status: string
  bookmarkPromptVisible: boolean
  selectionText: string
}

const props = defineProps<{
  sidebarWidth: number
  state: OverlayStateView
}>()

const emit = defineEmits<{
  toggleSidebar: []
  captureSelection: []
  toggleElementMode: []
  deleteSnippet: [snippetId: string]
  analyzeSnippet: [snippetId: string]
  analyzeAllSnippets: []
  reanalyzeAllSnippets: []
  openOptions: []
  openHistory: []
  classifyNow: []
  dismissBookmarkPrompt: []
}>()

const sidebarTransform = computed(() =>
  props.state.sidebarOpen ? "translateX(0)" : "translateX(100%)"
)

const floatingButtonRight = computed(() =>
  props.state.sidebarOpen ? `${props.sidebarWidth + 24}px` : "20px"
)

const promptRight = computed(() =>
  props.state.sidebarOpen ? `${props.sidebarWidth + 72}px` : "72px"
)
</script>

<template>
  <div class="overlay-root">
    <div
      v-if="state.bookmarkPromptVisible"
      class="prompt"
      :style="{ right: promptRight }">
      <div class="prompt-title">已检测到你收藏了当前页面</div>
      <div class="prompt-text">要不要现在整理标签并补充当前页的小知识点？</div>
      <div class="prompt-actions">
        <button class="chip chip-gradient" @click="emit('classifyNow')">
          <font-awesome-icon icon="bolt" />
          立即分类标签
        </button>
        <button class="chip" @click="emit('dismissBookmarkPrompt')">
          <font-awesome-icon icon="clock" />
          稍后
        </button>
      </div>
    </div>

    <button
      class="floating-ball"
      :style="{ right: floatingButtonRight }"
      title="切换页面知识侧边栏"
      @click="emit('toggleSidebar')">
      <font-awesome-icon icon="wand-magic-sparkles" />
    </button>

    <aside
      class="sidebar"
      :style="{ width: `${sidebarWidth}px`, transform: sidebarTransform }">
      <div class="sidebar-head">
        <div class="sidebar-title-wrap">
          <div class="sidebar-eyebrow">Current Bookmark</div>
          <div class="sidebar-title">页面知识抓取</div>
          <div class="sidebar-subtitle">
            统一收集当前书签页下的小知识点，不做分类拆分。
          </div>
        </div>
        <button class="chip" @click="emit('toggleSidebar')">
          <font-awesome-icon icon="chevron-right" />
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
          这里会展示当前书签页提取出的多个小知识点。你可以先选中文字直接加入，也可以开启框选模式点击页面区域。
        </div>
        <OverlaySnippetCard
          v-for="snippet in state.draft.snippets"
          :key="snippet.id"
          :snippet="snippet"
          @analyze="emit('analyzeSnippet', $event)"
          @delete="emit('deleteSnippet', $event)" />
      </div>

      <div class="sidebar-footer">
        <div class="footer-text">模型配置和书签整理保留在管理页中</div>
        <div class="footer-actions">
          <button class="chip" @click="emit('openOptions')">
            <font-awesome-icon icon="gear" />
            模型
          </button>
          <button class="chip" @click="emit('openHistory')">
            <font-awesome-icon icon="bookmark" />
            书签
          </button>
        </div>
      </div>
    </aside>
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
  font-size: var(--sf-font-size-md);
}

.overlay-root,
.overlay-root * {
  box-sizing: border-box;
}

.overlay-root button {
  font: inherit;
}

.prompt {
  position: fixed;
  top: 86px;
  pointer-events: auto;
  max-width: 240px;
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
.footer-actions {
  display: flex;
  gap: var(--sf-space-2);
}

.floating-ball {
  --ball-size: 32px;
  position: fixed;
  top: 84px;
  pointer-events: auto;
  width: var(--ball-size);
  min-width: var(--ball-size);
  max-width: var(--ball-size);
  height: var(--ball-size);
  min-height: var(--ball-size);
  max-height: var(--ball-size);
  aspect-ratio: 1 / 1;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  appearance: none;
  -webkit-appearance: none;
  line-height: 1;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.96);
  outline: 1px solid rgba(74, 107, 164, 0.52);
  background: radial-gradient(
    circle at 30% 30%,
    #ffe1f5 0%,
    #b9ecff 42%,
    #6c95ff 100%
  );
  box-shadow:
    0 10px 24px rgba(57, 93, 156, 0.4),
    0 0 0 3px rgba(168, 216, 255, 0.22);
  cursor: pointer;
}

.sidebar {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  pointer-events: auto;
  transition: transform 220ms ease;
  display: flex;
  flex-direction: column;
  border-radius: 0;
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

.sidebar-head {
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

.chip-gradient {
  background: linear-gradient(135deg, #ff8ed8 0%, #8ad8ff 100%);
  color: #21304f;
}

.selection-panel {
  margin: var(--sf-space-3) var(--sf-space-4) 0;
  border-radius: var(--sf-radius-lg);
  padding: var(--sf-space-3);
  background: linear-gradient(135deg, #fff1fa 0%, #eef9ff 100%);
  border: 1px solid rgba(150, 195, 235, 0.18);
}

.selection-label {
  font-size: var(--sf-font-size-xs);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7c86ad;
  margin-bottom: var(--sf-space-1);
}

.selection-text {
  font-size: var(--sf-font-size-sm);
  line-height: 1.65;
  color: #31415f;
}

.snippet-list {
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
</style>
