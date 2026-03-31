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
          <i class="fa-solid fa-bolt" aria-hidden="true" />
          立即分类标签
        </button>
        <button class="chip" @click="emit('dismissBookmarkPrompt')">
          <i class="fa-solid fa-clock" aria-hidden="true" />
          稍后
        </button>
      </div>
    </div>

    <button
      class="floating-ball"
      :style="{ right: floatingButtonRight }"
      title="切换页面知识侧边栏"
      @click="emit('toggleSidebar')">
      <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
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
          <i class="fa-solid fa-chevron-right" aria-hidden="true" />
          收起
        </button>
      </div>
      <div class="sidebar-status">{{ state.status }}</div>

      <div class="toolbar">
        <button class="chip chip-gradient" @click="emit('captureSelection')">
          <i class="fa-solid fa-highlighter" aria-hidden="true" />
          抓取当前选中
        </button>
        <button class="chip" @click="emit('toggleElementMode')">
          <i class="fa-solid fa-vector-square" aria-hidden="true" />
          {{ state.elementPickMode ? "退出框选模式" : "开启框选模式" }}
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
          @delete="emit('deleteSnippet', $event)" />
      </div>

      <div class="sidebar-footer">
        <div class="footer-text">模型配置和书签整理保留在管理页中</div>
        <div class="footer-actions">
          <button class="chip" @click="emit('openOptions')">
            <i class="fa-solid fa-gear" aria-hidden="true" />
            模型配置
          </button>
          <button class="chip" @click="emit('openHistory')">
            <i class="fa-solid fa-bookmark" aria-hidden="true" />
            书签整理
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
  font-family: "SF Pro Text", "Segoe UI", "PingFang SC", "Hiragino Sans GB",
    sans-serif;
  font-size: 14px;
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
  border-radius: 18px;
  padding: 14px 14px 12px;
  background: linear-gradient(135deg, #fff9ff 0%, #f4fbff 55%, #edf8ff 100%);
  border: 1px solid rgba(132, 174, 224, 0.24);
  box-shadow: 0 18px 34px rgba(93, 118, 164, 0.18);
}

.prompt-title {
  font-size: 14px;
  font-weight: 800;
  color: #2b3962;
  margin-bottom: 6px;
}

.prompt-text {
  font-size: 13px;
  line-height: 1.6;
  color: #6d7994;
  margin-bottom: 10px;
}

.prompt-actions,
.footer-actions {
  display: flex;
  gap: 8px;
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
  padding: 18px 18px 14px;
  border-bottom: 1px solid rgba(136, 176, 224, 0.14);
  background: linear-gradient(
    135deg,
    rgba(255, 217, 244, 0.58) 0%,
    rgba(213, 243, 255, 0.68) 65%,
    rgba(240, 248, 255, 0.76) 100%
  );
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.sidebar-eyebrow {
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7d88b1;
  font-weight: 800;
}

.sidebar-title {
  font-size: 22px;
  line-height: 1.05;
  font-weight: 900;
  color: #25324d;
  margin-top: 6px;
}

.sidebar-subtitle {
  font-size: 13px;
  line-height: 1.6;
  color: #6e7997;
  margin-top: 8px;
}

.sidebar-status {
  padding: 12px 18px 0;
  font-size: 13px;
  line-height: 1.6;
  color: #65728f;
}

.toolbar {
  padding: 16px 16px 0;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chip {
  border: 0;
  border-radius: 999px;
  padding: 9px 12px;
  background: #eef4ff;
  color: #657899;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.chip-gradient {
  background: linear-gradient(135deg, #ff8ed8 0%, #8ad8ff 100%);
  color: #21304f;
}

.selection-panel {
  margin: 14px 16px 0;
  border-radius: 18px;
  padding: 12px 13px;
  background: linear-gradient(135deg, #fff1fa 0%, #eef9ff 100%);
  border: 1px solid rgba(150, 195, 235, 0.18);
}

.selection-label {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7c86ad;
  margin-bottom: 6px;
}

.selection-text {
  font-size: 13px;
  line-height: 1.65;
  color: #31415f;
}

.snippet-list {
  padding: 14px 16px 16px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.empty-state {
  border-radius: 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px dashed rgba(126, 169, 220, 0.28);
  font-size: 13px;
  line-height: 1.7;
  color: #72809e;
}

.sidebar-footer {
  padding: 12px 16px 16px;
  border-top: 1px solid rgba(136, 176, 224, 0.12);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.footer-text {
  font-size: 12px;
  color: #8591ac;
}
</style>
