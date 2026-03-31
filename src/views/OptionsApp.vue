<script setup lang="ts">
import { computed, onMounted, ref } from "vue"

import { SmartFavoritesSDK } from "../sdk/client"
import {
  DEFAULT_PROMPT_TEMPLATE,
  DEFAULT_SYSTEM_PROMPT
} from "../sdk/constants"
import type {
  BookmarkMoveDecision,
  ExportSnapshot,
  HistoryRecommendationItem,
  SmartFavoritesSettings
} from "../sdk/types"
import BaseButton from "../ui/BaseButton.vue"
import BaseCard from "../ui/BaseCard.vue"
import FormField from "../ui/FormField.vue"
import SectionHeader from "../ui/SectionHeader.vue"
import HistoryItemCard from "./HistoryItemCard.vue"

const sdk = new SmartFavoritesSDK()

const settings = ref<SmartFavoritesSettings | null>(null)
const status = ref("正在加载设置…")
const tab = ref<"settings" | "history">(
  location.hash === "#history" ? "history" : "settings"
)
const historyItems = ref<HistoryRecommendationItem[]>([])
const selectedIds = ref<string[]>([])
const historyStatus = ref("正在加载历史书签推荐…")

const selectedDecisions = computed<BookmarkMoveDecision[]>(() =>
  historyItems.value
    .filter((item) => selectedIds.value.includes(item.bookmark.id))
    .map((item) => ({
      bookmarkId: item.bookmark.id,
      recommendation: item.recommendation.suggestions[0]
    }))
    .filter((item) => Boolean(item.recommendation))
)

onMounted(() => {
  void loadSettings()
  void refreshHistory()

  const onHashChange = () => {
    tab.value = location.hash === "#history" ? "history" : "settings"
  }

  window.addEventListener("hashchange", onHashChange)
})

const updateSettings = (next: SmartFavoritesSettings) => {
  settings.value = next
}

const loadSettings = async () => {
  settings.value = await sdk.getSettings()
  status.value = "已读取当前配置。"
}

const saveSettings = async () => {
  if (!settings.value) {
    return
  }

  await sdk.saveSettings(settings.value)
  status.value = "配置已保存。"
}

const downloadJson = (snapshot: ExportSnapshot) => {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json"
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `smart-favorites-backup-${Date.now()}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

const exportBackup = async () => {
  const snapshot = await sdk.exportSnapshot()
  downloadJson(snapshot)
  status.value = "已导出本地备份。"
}

const refreshHistory = async () => {
  historyStatus.value = "正在重新生成历史书签推荐…"
  const items = await sdk.listHistoryBookmarks(40)
  historyItems.value = items.filter(
    (item) => item.recommendation.suggestions.length > 0
  )
  selectedIds.value = []
  historyStatus.value = "已生成推荐。勾选需要迁移的书签后再执行。"
}

const applySelected = async () => {
  if (selectedDecisions.value.length === 0) {
    historyStatus.value = "先勾选至少一条推荐记录。"
    return
  }

  const result = await sdk.applyBulkBookmarkRecommendations(
    selectedDecisions.value
  )
  historyStatus.value = `已迁移 ${result.moved} 条书签。`
  await refreshHistory()
}

const toggleSelected = (id: string) => {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((item) => item !== id)
    : [...selectedIds.value, id]
}

const switchTab = (next: "settings" | "history") => {
  tab.value = next
  location.hash = next === "history" ? "#history" : ""
}

const readInputValue = (event: Event) => {
  const target = event.target
  return target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
    ? target.value
    : ""
}

const readCheckedValue = (event: Event) => {
  const target = event.target
  return target instanceof HTMLInputElement ? target.checked : false
}

const onBaseUrlInput = (event: Event) => {
  if (!settings.value) {
    return
  }

  updateSettings({
    ...settings.value,
    provider: {
      ...settings.value.provider,
      baseUrl: readInputValue(event)
    }
  })
}

const onModelInput = (event: Event) => {
  if (!settings.value) {
    return
  }

  updateSettings({
    ...settings.value,
    provider: {
      ...settings.value.provider,
      model: readInputValue(event)
    }
  })
}

const onApiKeyInput = (event: Event) => {
  if (!settings.value) {
    return
  }

  updateSettings({
    ...settings.value,
    provider: {
      ...settings.value.provider,
      apiKey: readInputValue(event)
    }
  })
}

const onSystemPromptInput = (event: Event) => {
  if (!settings.value) {
    return
  }

  updateSettings({
    ...settings.value,
    prompts: {
      ...settings.value.prompts,
      system: readInputValue(event)
    }
  })
}

const onTemplateInput = (event: Event) => {
  if (!settings.value) {
    return
  }

  updateSettings({
    ...settings.value,
    prompts: {
      ...settings.value.prompts,
      template: readInputValue(event)
    }
  })
}

const onAllowCreateFolderChange = (event: Event) => {
  if (!settings.value) {
    return
  }

  updateSettings({
    ...settings.value,
    behavior: {
      ...settings.value.behavior,
      allowCreateFolder: readCheckedValue(event)
    }
  })
}

const onPreferExistingFolderChange = (event: Event) => {
  if (!settings.value) {
    return
  }

  updateSettings({
    ...settings.value,
    behavior: {
      ...settings.value.behavior,
      preferExistingFolder: readCheckedValue(event)
    }
  })
}

const onStoreKnowledgeChange = (event: Event) => {
  if (!settings.value) {
    return
  }

  updateSettings({
    ...settings.value,
    behavior: {
      ...settings.value.behavior,
      storeKnowledge: readCheckedValue(event)
    }
  })
}
</script>

<template>
  <main class="page">
    <BaseCard class="panel-head">
      <div>
        <div class="eyebrow">Workspace</div>
        <div class="title">插件管理台</div>
      </div>
      <div class="tab-actions">
        <BaseButton
          :variant="tab === 'settings' ? 'primary' : 'secondary'"
          @click="switchTab('settings')">
          <font-awesome-icon icon="gear" />
          模型配置
        </BaseButton>
        <BaseButton
          :variant="tab === 'history' ? 'primary' : 'secondary'"
          @click="switchTab('history')">
          <font-awesome-icon icon="bookmark" />
          历史整理
        </BaseButton>
      </div>
    </BaseCard>

    <template v-if="!settings">
      <BaseCard>{{ status }}</BaseCard>
    </template>

    <template v-else-if="tab === 'settings'">
      <BaseCard>
        <SectionHeader compact title="AI Provider" />
        <FormField label="接口基地址">
          <input
            class="field"
            :value="settings.provider.baseUrl"
            @input="onBaseUrlInput" />
        </FormField>
        <FormField label="模型名称">
          <input
            class="field"
            :value="settings.provider.model"
            @input="onModelInput" />
        </FormField>
        <FormField label="API Key">
          <input
            class="field"
            type="password"
            :value="settings.provider.apiKey"
            @input="onApiKeyInput" />
        </FormField>
      </BaseCard>

      <BaseCard>
        <SectionHeader compact title="Prompt 模板" />
        <FormField label="System Prompt">
          <textarea
            class="field"
            rows="6"
            :value="settings.prompts.system"
            @input="onSystemPromptInput" />
        </FormField>
        <FormField label="User Prompt Template">
          <textarea
            class="field"
            rows="12"
            :value="settings.prompts.template"
            @input="onTemplateInput" />
        </FormField>
        <BaseButton
          @click="
            updateSettings({
              ...settings,
              prompts: {
                system: DEFAULT_SYSTEM_PROMPT,
                template: DEFAULT_PROMPT_TEMPLATE
              }
            })
          ">
          <font-awesome-icon icon="rotate-left" />
          恢复默认模板
        </BaseButton>
      </BaseCard>

      <BaseCard>
        <SectionHeader compact title="策略开关" />
        <label class="check-item"
          ><input
            type="checkbox"
            :checked="settings.behavior.allowCreateFolder"
            @change="onAllowCreateFolderChange" />允许推荐创建新文件夹</label
        >
        <label class="check-item"
          ><input
            type="checkbox"
            :checked="settings.behavior.preferExistingFolder"
            @change="
              onPreferExistingFolderChange
            " />优先推荐已有结构，降低新建文件夹频率</label
        >
        <label class="check-item"
          ><input
            type="checkbox"
            :checked="settings.behavior.storeKnowledge"
            @change="
              onStoreKnowledgeChange
            " />保存页面摘要、标签和推荐结果到本地知识库</label
        >
      </BaseCard>

      <BaseCard class="actions">
        <div class="status">{{ status }}</div>
        <div class="button-row">
          <BaseButton @click="exportBackup">
            <font-awesome-icon icon="file-export" />
            导出备份
          </BaseButton>
          <BaseButton variant="primary" @click="saveSettings">
            <font-awesome-icon icon="floppy-disk" />
            保存配置
          </BaseButton>
        </div>
      </BaseCard>
    </template>

    <template v-else>
      <BaseCard>
        <div class="row">
          <SectionHeader compact title="历史书签批量整理" />
          <div class="button-row">
            <BaseButton @click="refreshHistory">
              <font-awesome-icon icon="arrows-rotate" />
              刷新推荐
            </BaseButton>
            <BaseButton variant="primary" @click="applySelected">
              <font-awesome-icon icon="check" />
              应用选中项
            </BaseButton>
          </div>
        </div>
        <div class="status">{{ historyStatus }}</div>
      </BaseCard>

      <BaseCard>
        <div class="history-list">
          <HistoryItemCard
            v-for="item in historyItems"
            :key="item.bookmark.id"
            :checked="selectedIds.includes(item.bookmark.id)"
            :item="item"
            @toggle="toggleSelected" />
        </div>
      </BaseCard>
    </template>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 32px;
  background: linear-gradient(135deg, #f3f7ff 0%, #fff8e8 45%, #fff 100%);
  color: var(--sf-color-text);
  font-size: var(--sf-font-size-md);
  font-family: var(--sf-font-family);
}

:deep(.base-card) {
  max-width: 1100px;
  margin: 0 auto var(--sf-space-5);
  padding: var(--sf-space-6);
  border-radius: var(--sf-radius-xl);
}

.panel-head,
.row,
.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sf-space-4);
}

.tab-actions,
.button-row {
  display: flex;
  gap: var(--sf-space-3);
}

.eyebrow {
  font-size: var(--sf-font-size-xs);
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--sf-color-text-muted);
}

.title {
  font-size: var(--sf-font-size-2xl);
  font-weight: 800;
  margin-top: var(--sf-space-1);
}

.field {
  width: 100%;
  min-height: var(--sf-button-height);
  padding: var(--sf-space-3) var(--sf-space-4);
  border-radius: var(--sf-radius-md);
  border: 1px solid #d7deea;
  box-sizing: border-box;
  font-size: var(--sf-font-size-md);
  background: var(--sf-color-surface);
  resize: vertical;
}

.check-item {
  display: flex;
  gap: var(--sf-space-2);
  margin-bottom: var(--sf-space-3);
  font-size: var(--sf-font-size-sm);
}

.status {
  color: var(--sf-color-text-muted);
  font-size: var(--sf-font-size-md);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--sf-space-3);
}
</style>
