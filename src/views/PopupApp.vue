<script setup lang="ts">
import { computed, onMounted, ref } from "vue"

import { SmartFavoritesSDK } from "../sdk/client"
import { GITHUB_REPO_URL } from "../sdk/constants"
import type {
  BookmarkMutationResult,
  CapturePageResponse,
  RecommendationInput,
  RecommendationResult,
  SmartFavoritesSettings
} from "../sdk/types"
import BaseButton from "../ui/BaseButton.vue"
import BaseCard from "../ui/BaseCard.vue"
import FormField from "../ui/FormField.vue"
import SectionHeader from "../ui/SectionHeader.vue"
import SuggestionCard from "./SuggestionCard.vue"

const QUICK_CAPTURE_FOLDER = "待整理"

const sdk = new SmartFavoritesSDK()

const capture = ref<CapturePageResponse | null>(null)
const settings = ref<SmartFavoritesSettings | null>(null)
const notes = ref("")
const manualTags = ref("")
const newFolderTitle = ref("")
const recommendation = ref<RecommendationResult | null>(null)
const selectedTarget = ref("")
const status = ref("正在读取当前页面…")
const isLoading = ref(false)
const result = ref<BookmarkMutationResult | null>(null)

const canRecommend = computed(() => Boolean(capture.value?.page.url))
const selectedSuggestion = computed(() =>
  recommendation.value?.suggestions.find(
    (item) => item.key === selectedTarget.value
  )
)

const activeModelLabel = computed(() => {
  if (!settings.value) {
    return "未配置 AI 模型"
  }

  const activeProvider =
    settings.value.providers.find(
      (provider) => provider.id === settings.value?.activeProviderId
    ) ?? settings.value.providers[0]

  return activeProvider?.label || activeProvider?.model || "未配置 AI 模型"
})

const quickFacts = computed(() => {
  if (!capture.value?.page) {
    return []
  }

  const page = capture.value.page
  return [
    { label: "标题", value: page.title || "未识别" },
    { label: "作者", value: page.author || "未识别" },
    { label: "站点", value: page.siteName || page.domain || "未识别" },
    { label: "域名", value: page.domain || "未识别" }
  ]
})

const pageSummary = computed(() => {
  if (!capture.value?.page) {
    return "没有可分析的页面信息。"
  }

  const selection = capture.value.selectionText?.trim()
  if (selection) {
    return selection
  }

  return (
    capture.value.page.summary ||
    "未抓取到足够正文，建议手动选择页面文字后再次抓取。"
  )
})

onMounted(() => {
  void bootstrap()
})

const parseTags = () =>
  manualTags.value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)

const bootstrap = async () => {
  isLoading.value = true
  status.value = "正在读取插件配置和当前页面…"

  try {
    const [loadedSettings, loadedCapture] = await Promise.all([
      sdk.getSettings(),
      sdk.captureActivePage()
    ])

    settings.value = loadedSettings
    capture.value = loadedCapture
    status.value = loadedCapture.page.url
      ? "页面上下文已就绪，可以直接推荐收藏夹。"
      : "当前标签页不可抓取，可手动输入备注后继续。"
  } catch (error) {
    status.value =
      error instanceof Error ? error.message : "无法初始化当前页面信息。"
  } finally {
    isLoading.value = false
  }
}

const refreshCapture = async () => {
  isLoading.value = true
  status.value = "正在重新抓取当前页内容…"

  try {
    const nextCapture = await sdk.captureActivePage()
    capture.value = nextCapture
    status.value = "已更新页面内容，可以重新生成推荐。"
  } catch (error) {
    status.value =
      error instanceof Error ? error.message : "抓取失败，请刷新页面后重试。"
  } finally {
    isLoading.value = false
  }
}

const runRecommendation = async () => {
  if (!capture.value?.page.url) {
    status.value = "当前没有可用于分析的网址。"
    return
  }

  isLoading.value = true
  status.value = "正在分析页面和现有收藏夹结构…"

  try {
    const payload: RecommendationInput = {
      page: capture.value.page,
      notes: notes.value,
      selectedText: capture.value.selectionText,
      tags: parseTags()
    }

    const nextRecommendation = await sdk.recommendFolders(payload)
    recommendation.value = nextRecommendation
    selectedTarget.value = nextRecommendation.suggestions[0]?.key ?? ""

    const createdSuggestion = nextRecommendation.suggestions.find(
      (item) => item.type === "create"
    )
    if (createdSuggestion?.title) {
      newFolderTitle.value = createdSuggestion.title
    }

    status.value =
      nextRecommendation.source === "ai"
        ? "已完成 AI 推荐，请确认后执行。"
        : "已完成本地推荐。配置模型后可获得更强的分类建议。"
  } catch (error) {
    status.value =
      error instanceof Error ? error.message : "推荐失败，请稍后再试。"
  } finally {
    isLoading.value = false
  }
}

const applyRecommendation = async () => {
  if (!capture.value?.page.url || !selectedSuggestion.value) {
    status.value = "请先完成推荐并选择目标收藏夹。"
    return
  }

  isLoading.value = true
  status.value = "正在写入浏览器书签…"

  try {
    const mutation = await sdk.applyBookmarkRecommendation({
      page: capture.value.page,
      input: {
        page: capture.value.page,
        notes: notes.value,
        selectedText: capture.value.selectionText,
        tags: parseTags()
      },
      recommendation: {
        ...selectedSuggestion.value,
        title:
          selectedSuggestion.value.type === "create"
            ? newFolderTitle.value.trim() || selectedSuggestion.value.title
            : selectedSuggestion.value.title
      }
    })

    result.value = mutation
    status.value = mutation.message
  } catch (error) {
    status.value =
      error instanceof Error ? error.message : "写入书签失败，请稍后再试。"
  } finally {
    isLoading.value = false
  }
}

const quickCapture = async () => {
  if (!capture.value?.page.url) {
    status.value = "当前没有可用于抓取的网址。"
    return
  }

  isLoading.value = true
  status.value = "正在执行一键抓取…"

  try {
    const page = capture.value.page
    const derivedTags = [page.domain, page.siteName, page.author]
      .filter(Boolean)
      .slice(0, 3) as string[]

    const mutation = await sdk.applyBookmarkRecommendation({
      page,
      input: {
        page,
        notes: `一键抓取：${page.title}`,
        selectedText: capture.value.selectionText,
        tags: [...parseTags(), ...derivedTags].slice(0, 6)
      },
      recommendation: {
        key: `create:${QUICK_CAPTURE_FOLDER}`,
        type: "create",
        title: QUICK_CAPTURE_FOLDER,
        path: `新建 / ${QUICK_CAPTURE_FOLDER}`,
        score: 0.5,
        reason: "一键抓取按标题/作者/站点做快速归档"
      }
    })

    result.value = mutation
    status.value = `已一键抓取到「${QUICK_CAPTURE_FOLDER}」。`
  } catch (error) {
    status.value =
      error instanceof Error ? error.message : "一键抓取失败，请稍后再试。"
  } finally {
    isLoading.value = false
  }
}

const openGithub = () => {
  window.open(GITHUB_REPO_URL, "_blank", "noopener,noreferrer")
}
</script>

<template>
  <main class="panel">
    <div class="stack">
      <BaseCard>
        <div class="hero">
          <SectionHeader
            compact
            eyebrow="Smart Favorites AI"
            title="AI 智能书签分类助手"
            subtitle="优先推荐，不自动替你改结构。你确认后，插件才会移动或创建书签。" />
          <div class="hero-actions">
            <BaseButton @click="openGithub">
              <font-awesome-icon icon="up-right-from-square" />
              GitHub
            </BaseButton>
            <BaseButton variant="primary" @click="refreshCapture">
              <font-awesome-icon icon="rotate-right" />
              重新抓取
            </BaseButton>
          </div>
        </div>
      </BaseCard>

      <BaseCard>
        <SectionHeader compact title="默认抓取分类" />
        <div class="quick-facts">
          <div
            v-for="fact in quickFacts"
            :key="fact.label"
            class="quick-fact-item">
            <span class="quick-fact-label">{{ fact.label }}</span>
            <span class="quick-fact-value">{{ fact.value }}</span>
          </div>
        </div>
        <BaseButton
          :disabled="isLoading || !capture?.page.url"
          @click="quickCapture">
          <font-awesome-icon icon="bolt" />
          一键抓取
        </BaseButton>
      </BaseCard>

      <BaseCard>
        <div class="row">
          <strong>当前页面</strong>
          <span class="muted">{{
            activeModelLabel !== "未配置 AI 模型"
              ? `模型：${activeModelLabel}`
              : "未配置 AI 模型"
          }}</span>
        </div>
        <div class="title">{{ capture?.page.title || "未识别标题" }}</div>
        <div class="muted break">
          {{ capture?.page.url || "当前标签页没有标准网页地址。" }}
        </div>
        <textarea class="field" readonly rows="6" :value="pageSummary" />
      </BaseCard>

      <BaseCard>
        <SectionHeader compact title="增强信息" />
        <FormField label="手动标签" hint="使用英文逗号分隔">
          <input
            v-model="manualTags"
            class="field"
            placeholder="例如：AI, 插件开发, 浏览器" />
        </FormField>
        <FormField label="补充备注">
          <textarea
            v-model="notes"
            class="field"
            rows="4"
            placeholder="这条书签为什么重要，后续会怎么用" />
        </FormField>
      </BaseCard>

      <BaseCard>
        <div class="row">
          <strong>分类推荐</strong>
          <BaseButton
            :disabled="!canRecommend || isLoading"
            variant="accent"
            @click="runRecommendation">
            <font-awesome-icon icon="wand-magic-sparkles" />
            开始推荐
          </BaseButton>
        </div>

        <div v-if="recommendation" class="suggestions">
          <SuggestionCard
            v-for="item in recommendation.suggestions"
            :key="item.key"
            :selected="item.key === selectedTarget"
            :suggestion="item"
            @select="selectedTarget = $event" />

          <FormField
            v-if="selectedSuggestion?.type === 'create'"
            label="新建文件夹名称">
            <input v-model="newFolderTitle" class="field" />
          </FormField>

          <BaseButton
            :disabled="isLoading || !selectedSuggestion"
            variant="primary"
            @click="applyRecommendation">
            <font-awesome-icon icon="folder-tree" />
            确认并写入书签
          </BaseButton>
        </div>
        <div v-else class="muted">
          点击“开始推荐”后，系统会结合当前页面、你的备注和现有书签结构生成候选文件夹。
        </div>
      </BaseCard>

      <BaseCard>
        <strong>运行状态</strong>
        <div class="status">{{ status }}</div>
        <div v-if="result" class="muted">
          已处理书签：{{ result.bookmark.title }} → {{ result.folderPath }}
        </div>
      </BaseCard>
    </div>
  </main>
</template>

<style scoped>
.panel {
  width: 460px;
  min-height: 700px;
  padding: var(--sf-space-4);
  background: radial-gradient(
    circle at top left,
    #fff6df 0%,
    #fffdf7 35%,
    #f4f7fb 100%
  );
  color: var(--sf-color-text);
  font-family: var(--sf-font-family);
}

.stack {
  display: flex;
  flex-direction: column;
  gap: var(--sf-space-3);
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--sf-space-3);
}

.hero-actions {
  display: flex;
  gap: var(--sf-space-2);
  flex-wrap: wrap;
  justify-content: flex-end;
}

.muted {
  color: var(--sf-color-text-muted);
  font-size: var(--sf-font-size-sm);
  line-height: var(--sf-line-height-normal);
}

.quick-facts {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sf-space-2);
  margin-bottom: var(--sf-space-3);
}

.quick-fact-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sf-space-2);
  border: 1px solid var(--sf-color-border);
  border-radius: var(--sf-radius-sm);
  padding: var(--sf-space-2) var(--sf-space-3);
  background: #fafcff;
}

.quick-fact-label {
  font-size: var(--sf-font-size-sm);
  font-weight: 700;
  color: #4c5a76;
}

.quick-fact-value {
  font-size: var(--sf-font-size-sm);
  color: #1f2d46;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sf-space-2);
  margin-bottom: var(--sf-space-2);
}

.title {
  font-size: var(--sf-font-size-lg);
  font-weight: 700;
  margin-bottom: var(--sf-space-1);
}

.break {
  word-break: break-all;
  margin-bottom: var(--sf-space-2);
}

.field {
  width: 100%;
  min-height: var(--sf-button-height);
  padding: var(--sf-space-2) var(--sf-space-3);
  border-radius: var(--sf-radius-md);
  border: 1px solid #cfd8e3;
  background: var(--sf-color-surface);
  box-sizing: border-box;
  font-size: var(--sf-font-size-md);
  color: var(--sf-color-text);
  resize: vertical;
  margin-top: var(--sf-space-1);
}

.suggestions {
  display: flex;
  flex-direction: column;
  gap: var(--sf-space-2);
}

.status {
  font-size: var(--sf-font-size-md);
  line-height: var(--sf-line-height-relaxed);
  margin-top: var(--sf-space-2);
}
</style>
