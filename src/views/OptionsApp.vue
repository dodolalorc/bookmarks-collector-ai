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
  SmartFavoritesSettings,
  SnippetCollectionFolder,
  SnippetCollectionItem,
  SnippetCollectionState
} from "../sdk/types"
import BaseButton from "../ui/BaseButton.vue"
import BaseCard from "../ui/BaseCard.vue"
import FormField from "../ui/FormField.vue"
import SectionHeader from "../ui/SectionHeader.vue"
import CollectionSnippetCard from "./CollectionSnippetCard.vue"
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
const collections = ref<SnippetCollectionState>({
  folders: [],
  items: []
})
const collectionsStatus = ref("正在加载收藏夹…")
const showApiKey = ref(false)
const activeFolderId = ref("uncategorized")
const folderNameInput = ref("")
const folderDescriptionInput = ref("")
const editingFolderId = ref("")
const itemTitleInput = ref("")
const itemTextInput = ref("")
const expandedItemIds = ref<string[]>([])
const editingItemId = ref("")
const editingItemTitle = ref("")
const editingItemText = ref("")

const selectedDecisions = computed<BookmarkMoveDecision[]>(() =>
  historyItems.value
    .filter((item) => selectedIds.value.includes(item.bookmark.id))
    .map((item) => ({
      bookmarkId: item.bookmark.id,
      recommendation: item.recommendation.suggestions[0]
    }))
    .filter((item) => Boolean(item.recommendation))
)

const activeFolder = computed(
  () =>
    collections.value.folders.find(
      (folder) => folder.id === activeFolderId.value
    ) ??
    collections.value.folders[0] ??
    null
)

const activeFolderItems = computed(() =>
  collections.value.items.filter(
    (item) => item.folderId === activeFolderId.value
  )
)

const hasAnyManagedContent = computed(
  () =>
    collections.value.folders.length > 1 || collections.value.items.length > 0
)

onMounted(() => {
  void loadSettings()
  void refreshHistory()
  void loadCollections()

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

const loadCollections = async () => {
  collections.value = await sdk.getSnippetCollections()
  if (
    !collections.value.folders.some(
      (folder) => folder.id === activeFolderId.value
    )
  ) {
    activeFolderId.value = collections.value.folders[0]?.id ?? "uncategorized"
  }
  collectionsStatus.value =
    collections.value.items.length > 0
      ? "已加载收藏夹内容。"
      : "第一次使用时，抓取的段落会先进入未分类内容。"
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
  anchor.download = `bookmarks-collector-backup-${Date.now()}.json`
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
  historyStatus.value =
    historyItems.value.length > 0
      ? "已生成推荐。勾选需要迁移的书签后再执行。"
      : "当前没有可迁移的历史推荐。"
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

const resetFolderForm = () => {
  editingFolderId.value = ""
  folderNameInput.value = ""
  folderDescriptionInput.value = ""
}

const startEditFolder = (folder: SnippetCollectionFolder) => {
  if (folder.isDefault) {
    return
  }

  editingFolderId.value = folder.id
  folderNameInput.value = folder.name
  folderDescriptionInput.value = folder.description ?? ""
}

const saveFolder = async () => {
  if (!folderNameInput.value.trim()) {
    collectionsStatus.value = "收藏夹名称不能为空。"
    return
  }

  if (editingFolderId.value) {
    const result = await sdk.updateSnippetFolder({
      folderId: editingFolderId.value,
      name: folderNameInput.value,
      description: folderDescriptionInput.value
    })
    collections.value = result.collections
    collectionsStatus.value = "已更新收藏夹。"
  } else {
    const result = await sdk.createSnippetFolder({
      name: folderNameInput.value,
      description: folderDescriptionInput.value
    })
    collections.value = result.collections
    activeFolderId.value = result.folderId
    collectionsStatus.value = "已创建新收藏夹。"
  }

  resetFolderForm()
}

const removeFolder = async (folder: SnippetCollectionFolder) => {
  if (folder.isDefault) {
    collectionsStatus.value = "未分类内容不能删除。"
    return
  }

  const result = await sdk.deleteSnippetFolder({ folderId: folder.id })
  collections.value = result.collections
  if (activeFolderId.value === folder.id) {
    activeFolderId.value = "uncategorized"
  }
  collectionsStatus.value = "已删除收藏夹，内容已回到未分类内容。"
}

const createItem = async () => {
  if (!itemTitleInput.value.trim() || !itemTextInput.value.trim()) {
    collectionsStatus.value = "段落标题和内容都不能为空。"
    return
  }

  const result = await sdk.createSnippetCollectionItem({
    folderId: activeFolderId.value,
    title: itemTitleInput.value,
    text: itemTextInput.value
  })
  collections.value = result.collections
  itemTitleInput.value = ""
  itemTextInput.value = ""
  collectionsStatus.value = "已新增段落内容。"
}

const startEditItem = (item: SnippetCollectionItem) => {
  editingItemId.value = item.id
  editingItemTitle.value = item.title
  editingItemText.value = item.text
}

const cancelEditItem = () => {
  editingItemId.value = ""
  editingItemTitle.value = ""
  editingItemText.value = ""
}

const saveItem = async (itemId: string) => {
  if (!editingItemTitle.value.trim() || !editingItemText.value.trim()) {
    collectionsStatus.value = "编辑内容不能为空。"
    return
  }

  const result = await sdk.updateSnippetCollectionItem({
    itemId,
    title: editingItemTitle.value,
    text: editingItemText.value
  })
  collections.value = result.collections
  cancelEditItem()
  collectionsStatus.value = "已保存段落修改。"
}

const moveItem = async (payload: { itemId: string; folderId: string }) => {
  const result = await sdk.moveSnippetCollectionItem(payload)
  collections.value = result.collections
  collectionsStatus.value = "已移动段落内容。"
}

const removeItem = async (itemId: string) => {
  const result = await sdk.deleteSnippetCollectionItem({ itemId })
  collections.value = result.collections
  collectionsStatus.value = "已删除段落内容。"
}

const toggleExpandedItem = (itemId: string) => {
  expandedItemIds.value = expandedItemIds.value.includes(itemId)
    ? expandedItemIds.value.filter((id) => id !== itemId)
    : [...expandedItemIds.value, itemId]
}

const getFolderItemCount = (folderId: string) =>
  collections.value.items.filter((item) => item.folderId === folderId).length

const handleItemTitleInput = (event: Event) => {
  itemTitleInput.value = readInputValue(event)
}

const handleItemTextInput = (event: Event) => {
  itemTextInput.value = readInputValue(event)
}

const handleFolderNameInput = (event: Event) => {
  folderNameInput.value = readInputValue(event)
}

const handleFolderDescriptionInput = (event: Event) => {
  folderDescriptionInput.value = readInputValue(event)
}

const handleCollectionCardStartEdit = (itemId: string) => {
  const target = collections.value.items.find((item) => item.id === itemId)
  if (!target) {
    return
  }

  startEditItem(target)
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
          <div class="secret-field">
            <input
              class="field secret-input"
              :type="showApiKey ? 'text' : 'password'"
              :value="settings.provider.apiKey"
              @input="onApiKeyInput" />
            <button
              v-if="settings.provider.apiKey"
              class="eye-button"
              type="button"
              :title="showApiKey ? '隐藏 Key' : '查看 Key'"
              @click="showApiKey = !showApiKey">
              <font-awesome-icon :icon="showApiKey ? 'eye-slash' : 'eye'" />
            </button>
          </div>
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
      <BaseCard class="history-header">
        <div>
          <SectionHeader compact title="历史整理" />
          <div class="status">{{ collectionsStatus }}</div>
        </div>
        <div class="button-row">
          <BaseButton @click="loadCollections">
            <font-awesome-icon icon="arrows-rotate" />
            刷新收藏夹
          </BaseButton>
          <BaseButton @click="refreshHistory">
            <font-awesome-icon icon="rotate-right" />
            刷新推荐
          </BaseButton>
          <BaseButton variant="primary" @click="applySelected">
            <font-awesome-icon icon="check" />
            应用选中项
          </BaseButton>
        </div>
      </BaseCard>

      <template v-if="!hasAnyManagedContent">
        <BaseCard class="empty-hero">
          <div class="empty-kicker">首次使用</div>
          <div class="empty-title">这里会成为你的历史整理工作台</div>
          <div class="empty-copy">
            当你在网页里划线抓取内容后，段落会先进入“未分类内容”。你也可以现在先创建一个空收藏夹，为后续整理预留结构。
          </div>
          <div class="empty-columns">
            <div class="empty-pill">1. 页面划线后自动入库</div>
            <div class="empty-pill">2. 支持新建空收藏夹</div>
            <div class="empty-pill">3. 可查看每段内容的原文</div>
          </div>
        </BaseCard>
      </template>

      <div class="history-grid">
        <BaseCard class="folders-panel">
          <div class="row">
            <SectionHeader compact title="收藏夹管理" />
          </div>
          <div class="folder-form">
            <input
              class="field"
              :value="folderNameInput"
              placeholder="新建收藏夹名称"
              @input="handleFolderNameInput" />
            <textarea
              class="field"
              rows="3"
              :value="folderDescriptionInput"
              placeholder="可选描述"
              @input="handleFolderDescriptionInput" />
            <div class="button-row">
              <BaseButton variant="primary" @click="saveFolder">
                <font-awesome-icon
                  :icon="editingFolderId ? 'floppy-disk' : 'folder-plus'" />
                {{ editingFolderId ? "保存收藏夹" : "新建空收藏夹" }}
              </BaseButton>
              <BaseButton v-if="editingFolderId" @click="resetFolderForm">
                取消编辑
              </BaseButton>
            </div>
          </div>

          <div class="folder-list">
            <button
              v-for="folder in collections.folders"
              :key="folder.id"
              class="folder-item"
              :class="{ active: activeFolderId === folder.id }"
              @click="activeFolderId = folder.id">
              <div class="folder-item-top">
                <div>
                  <div class="folder-name">{{ folder.name }}</div>
                  <div class="folder-desc">
                    {{ folder.description || "暂无描述" }}
                  </div>
                </div>
                <div class="folder-tools">
                  <span class="folder-count">
                    {{ getFolderItemCount(folder.id) }}
                  </span>
                  <button
                    v-if="!folder.isDefault"
                    class="mini-button"
                    type="button"
                    @click.stop="startEditFolder(folder)">
                    编辑
                  </button>
                  <button
                    v-if="!folder.isDefault"
                    class="mini-button danger"
                    type="button"
                    @click.stop="removeFolder(folder)">
                    删除
                  </button>
                </div>
              </div>
            </button>
          </div>
        </BaseCard>

        <BaseCard class="snippets-panel">
          <div class="row wrap">
            <div>
              <SectionHeader
                compact
                :title="
                  activeFolder ? `内容列表 · ${activeFolder.name}` : '内容列表'
                " />
              <div class="status">
                支持增删查改收藏夹中的内容，并查看每段内容的原始文本。
              </div>
            </div>
          </div>

          <div class="folder-form">
            <input
              class="field"
              :value="itemTitleInput"
              placeholder="新增段落标题"
              @input="handleItemTitleInput" />
            <textarea
              class="field"
              rows="4"
              :value="itemTextInput"
              placeholder="新增段落内容"
              @input="handleItemTextInput" />
            <div class="button-row">
              <BaseButton variant="primary" @click="createItem">
                <font-awesome-icon icon="plus" />
                新增内容
              </BaseButton>
            </div>
          </div>

          <div v-if="activeFolderItems.length === 0" class="soft-empty">
            当前收藏夹还没有内容。你可以直接新增一段内容，或者先去网页中划线抓取。
          </div>

          <div class="snippet-list">
            <CollectionSnippetCard
              v-for="item in activeFolderItems"
              :key="item.id"
              :item="item"
              :folders="collections.folders"
              :expanded="expandedItemIds.includes(item.id)"
              :editing="editingItemId === item.id"
              :draft-title="editingItemTitle"
              :draft-text="editingItemText"
              @toggle-expand="toggleExpandedItem"
              @start-edit="handleCollectionCardStartEdit"
              @cancel-edit="cancelEditItem"
              @update-draft-title="editingItemTitle = $event"
              @update-draft-text="editingItemText = $event"
              @save-edit="saveItem"
              @delete="removeItem"
              @move="moveItem" />
          </div>
        </BaseCard>
      </div>

      <BaseCard>
        <div class="row wrap">
          <div>
            <SectionHeader compact title="历史书签批量整理" />
            <div class="status">{{ historyStatus }}</div>
          </div>
        </div>
        <div v-if="historyItems.length === 0" class="soft-empty">
          当前没有可展示的历史推荐。
        </div>
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
  max-width: 1180px;
  margin: 0 auto var(--sf-space-5);
  padding: var(--sf-space-6);
  border-radius: var(--sf-radius-xl);
}

.panel-head,
.row,
.actions,
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sf-space-4);
}

.wrap {
  align-items: flex-start;
}

.tab-actions,
.button-row {
  display: flex;
  gap: var(--sf-space-3);
  flex-wrap: wrap;
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

.secret-field {
  position: relative;
}

.secret-input {
  padding-right: 52px;
}

.eye-button {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 999px;
  background: #edf4ff;
  color: #5570a1;
  cursor: pointer;
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
  line-height: 1.6;
}

.history-grid {
  max-width: 1180px;
  margin: 0 auto var(--sf-space-5);
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: var(--sf-space-5);
}

.folders-panel,
.snippets-panel {
  margin: 0;
}

.folder-form {
  display: grid;
  gap: 12px;
}

.folder-list,
.snippet-list,
.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--sf-space-3);
  margin-top: 18px;
}

.folder-item {
  width: 100%;
  padding: 16px;
  border: 1px solid rgba(124, 148, 188, 0.16);
  border-radius: 18px;
  background: linear-gradient(180deg, #fff, #f9fbff);
  text-align: left;
  cursor: pointer;
}

.folder-item.active {
  border-color: rgba(104, 147, 255, 0.5);
  box-shadow: 0 12px 24px rgba(97, 129, 184, 0.12);
  background: linear-gradient(
    135deg,
    rgba(255, 236, 247, 0.92),
    rgba(236, 248, 255, 0.98)
  );
}

.folder-item-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.folder-name {
  font-size: 15px;
  font-weight: 800;
  color: #23324d;
}

.folder-desc {
  margin-top: 4px;
  color: #7b879f;
  font-size: 12px;
  line-height: 1.5;
}

.folder-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.folder-count {
  min-width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #edf4ff;
  color: #5570a1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
}

.mini-button {
  border: 0;
  border-radius: 999px;
  padding: 6px 10px;
  background: #f0f4fb;
  color: #5a6e97;
  cursor: pointer;
}

.mini-button.danger {
  background: #ffe9ed;
  color: #ca3654;
}

.empty-hero {
  text-align: left;
  background: radial-gradient(
      circle at top right,
      rgba(255, 215, 239, 0.45),
      transparent 36%
    ),
    radial-gradient(
      circle at bottom left,
      rgba(184, 233, 255, 0.45),
      transparent 38%
    ),
    linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.97),
      rgba(245, 249, 255, 0.98)
    );
}

.empty-kicker {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #7d8bb0;
}

.empty-title {
  margin-top: 10px;
  font-size: 28px;
  font-weight: 800;
  color: #24324c;
}

.empty-copy {
  max-width: 680px;
  margin-top: 12px;
  line-height: 1.8;
  color: #62708a;
}

.empty-columns {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.empty-pill {
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(128, 154, 199, 0.14);
  color: #526689;
}

.soft-empty {
  margin-top: 18px;
  border-radius: 18px;
  padding: 20px;
  background: #f7faff;
  color: #66758d;
  line-height: 1.7;
}

@media (max-width: 980px) {
  .page {
    padding: 18px;
  }

  .history-grid {
    grid-template-columns: 1fr;
  }

  .panel-head,
  .row,
  .actions,
  .history-header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
