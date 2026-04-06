<script setup lang="ts">
import { computed, onMounted, ref } from "vue"

import { buildAnalyticsSummary } from "../sdk/analytics"
import { SmartFavoritesSDK } from "../sdk/client"
import { getProviderConfigNotice, resolveProvider } from "../sdk/provider"
import {
  DEFAULT_PROMPT_TEMPLATE,
  DEFAULT_SYSTEM_PROMPT,
  GITHUB_REPO_URL
} from "../sdk/constants"
import type {
  AiModelProfile,
  BookmarkMoveDecision,
  ExperimentCondition,
  ExperimentEvent,
  ExperimentPageType,
  ExportSnapshot,
  HistoryRecommendationItem,
  KnowledgeRecord,
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

const importInput = ref<HTMLInputElement | null>(null)
const settings = ref<SmartFavoritesSettings | null>(null)
const status = ref("正在加载设置…")
const tab = ref<"quickstart" | "settings" | "history" | "knowledge" | "analytics">(
  location.hash === "#quickstart"
    ? "quickstart"
    : location.hash === "#history"
      ? "history"
      : location.hash === "#knowledge"
        ? "knowledge"
        : location.hash === "#analytics"
          ? "analytics"
          : "settings"
)
const historyItems = ref<HistoryRecommendationItem[]>([])
const selectedIds = ref<string[]>([])
const historyStatus = ref("正在加载历史书签推荐…")
const collections = ref<SnippetCollectionState>({
  folders: [],
  items: []
})
const knowledgeRecords = ref<KnowledgeRecord[]>([])
const knowledgeStatus = ref("正在加载知识记录…")
const experimentEvents = ref<ExperimentEvent[]>([])
const analyticsStatus = ref("正在加载实验统计…")
const knowledgeQuery = ref("")
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
const historyRecommendationStartedAt = ref<number | null>(null)
const manualCondition = ref<ExperimentCondition>("manual")
const manualPageType = ref<ExperimentPageType>("unknown")
const manualSteps = ref("0")
const manualLatencyMs = ref("0")
const manualTop1Accepted = ref(false)
const manualTop3Covered = ref(false)
const manualExplanationSatisfaction = ref("")
const manualInterventionSatisfaction = ref("")
const manualNotes = ref("")

const quickStartSections = [
  {
    title: "1. 先配置模型",
    body:
      "进入“模型配置”，填写 Base URL、API Key 和模型名。当前激活模型配置完整后，页面 AI 整理和智能推荐才会使用模型能力。"
  },
  {
    title: "2. 在网页里抓取知识",
    body:
      "点击页面右侧上方悬浮球，打开“页面知识抓取”面板。它会像浏览器侧边工具一样挤压页面宽度，不再遮挡正文；你可以抓取选中文本，也可以开启框选模式。"
  },
  {
    title: "3. 用 AI 整理页面",
    body:
      "点击下方悬浮球打开“AI 页面整理”弹窗。这里适合补全文章元信息、调整正文、输入额外提示词，再执行一键整理。"
  },
  {
    title: "4. 管理抓取结果与历史书签",
    body:
      "“历史整理”页用于管理抓取片段、收藏夹和历史书签推荐；“知识笔记”页用于回看沉淀下来的知识记录。"
  },
  {
    title: "5. 导入与导出配置",
    body:
      "“模型配置”页现在同时支持导出和导入备份。导入会恢复扩展内部的设置、知识记录、页面草稿和内容收藏，但不会直接改写浏览器已有书签结构。"
  }
]

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

const filteredKnowledgeRecords = computed(() => {
  const query = knowledgeQuery.value.trim().toLowerCase()
  if (!query) {
    return knowledgeRecords.value
  }

  return knowledgeRecords.value.filter((record) =>
    [
      record.title,
      record.url,
      record.folderPath,
      record.tags.join(" "),
      record.notes ?? "",
      record.selectedText ?? ""
    ]
      .join("\n")
      .toLowerCase()
      .includes(query)
  )
})

const activeProvider = computed(() => {
  if (!settings.value) {
    return null
  }

  return (
    settings.value.providers.find(
      (provider) => provider.id === settings.value?.activeProviderId
    ) ??
    settings.value.providers[0] ??
    null
  )
})

const activeProviderNotice = computed(() => {
  if (!settings.value) {
    return ""
  }

  return getProviderConfigNotice(resolveProvider(settings.value))
})

const analyticsSummary = computed(() =>
  buildAnalyticsSummary(experimentEvents.value, knowledgeRecords.value)
)

const knowledgeInsightCards = computed(() => {
  const tagCount = new Set(
    knowledgeRecords.value.flatMap((record) => record.tags)
  ).size
  const folderCount = new Set(
    knowledgeRecords.value.map((record) => record.folderPath || "uncategorized")
  ).size
  const recentCount = knowledgeRecords.value.filter((record) => {
    const time = new Date(record.createdAt).getTime()
    return !Number.isNaN(time) && Date.now() - time <= 7 * 24 * 60 * 60 * 1000
  }).length

  return [
    { label: "知识记录", value: String(knowledgeRecords.value.length) },
    { label: "目录类别", value: String(folderCount) },
    { label: "标签数量", value: String(tagCount) },
    { label: "近 7 日新增", value: String(recentCount) }
  ]
})

onMounted(() => {
  void loadSettings()
  void refreshHistory()
  void loadCollections()
  void loadKnowledgeRecords()
  void loadExperimentEvents()

  const onHashChange = () => {
    tab.value =
      location.hash === "#quickstart"
        ? "quickstart"
        : location.hash === "#history"
          ? "history"
          : location.hash === "#knowledge"
            ? "knowledge"
            : location.hash === "#analytics"
              ? "analytics"
            : "settings"
  }

  window.addEventListener("hashchange", onHashChange)
})

const updateSettings = (next: SmartFavoritesSettings) => {
  settings.value = next
}

const syncActiveProviderView = (next: SmartFavoritesSettings): SmartFavoritesSettings => {
  const activeProvider =
    next.providers.find((provider) => provider.id === next.activeProviderId) ??
    next.providers[0]

  return {
    ...next,
    provider: activeProvider
      ? {
          baseUrl: activeProvider.baseUrl,
          apiKey: activeProvider.apiKey,
          model: activeProvider.model
        }
      : next.provider
  }
}

const loadSettings = async () => {
  const loaded = await sdk.getSettings()
  settings.value = syncActiveProviderView(loaded)
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

const loadKnowledgeRecords = async () => {
  knowledgeRecords.value = await sdk.getKnowledgeRecords()
  knowledgeStatus.value =
    knowledgeRecords.value.length > 0
      ? `已加载 ${knowledgeRecords.value.length} 条知识记录。`
      : "当前还没有知识记录，执行书签确认后会在这里沉淀学习轨迹。"
}

const loadExperimentEvents = async () => {
  experimentEvents.value = await sdk.getExperimentEvents()
  analyticsStatus.value =
    experimentEvents.value.length > 0
      ? `已加载 ${experimentEvents.value.length} 条实验事件。`
      : "当前还没有实验事件，可先执行一次推荐确认或手动补录。"
}

const saveSettings = async () => {
  if (!settings.value) {
    return
  }

  const normalized = syncActiveProviderView(settings.value)
  await sdk.saveSettings(normalized)
  settings.value = normalized
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

const triggerImportBackup = () => {
  importInput.value?.click()
}

const importBackup = async (event: Event) => {
  const target = event.target
  if (!(target instanceof HTMLInputElement) || !target.files?.[0]) {
    return
  }

  try {
    const text = await target.files[0].text()
    const snapshot = JSON.parse(text) as ExportSnapshot
    const result = await sdk.importSnapshot(snapshot)
    await Promise.all([
      loadSettings(),
      loadCollections(),
      loadKnowledgeRecords(),
      refreshHistory(),
      loadExperimentEvents()
    ])
    status.value =
      `已导入备份：${result.knowledgeCount} 条知识记录，` +
      `${result.draftCount} 个页面草稿，${result.collectionItemCount} 条内容片段。`
  } catch (error) {
    status.value =
      error instanceof Error ? `导入失败：${error.message}` : "导入失败，请检查备份文件格式。"
  } finally {
    target.value = ""
  }
}

const refreshHistory = async () => {
  historyRecommendationStartedAt.value = Date.now()
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

  const selectedItems = historyItems.value.filter((item) =>
    selectedIds.value.includes(item.bookmark.id)
  )
  const result = await sdk.applyBulkBookmarkRecommendations(selectedDecisions.value)
  await Promise.all(
    selectedItems.map((item, index) =>
      sdk.recordExperimentEvent({
        condition: "rule",
        source: "history",
        pageTitle: item.bookmark.title,
        url: item.bookmark.url,
        domain: new URL(item.bookmark.url).hostname,
        folderPath: result.results[index]?.folderPath,
        steps: 2,
        latencyMs: historyRecommendationStartedAt.value
          ? Date.now() - historyRecommendationStartedAt.value
          : 0,
        suggestionCount: item.recommendation.suggestions.length,
        selectedRank: 1,
        top1Accepted: true,
        top3Covered: item.recommendation.suggestions.length > 0,
        recommendedPaths: item.recommendation.suggestions.map((suggestion) => suggestion.path)
      })
    )
  )
  historyStatus.value = `已迁移 ${result.moved} 条书签。`
  await Promise.all([refreshHistory(), loadExperimentEvents(), loadKnowledgeRecords()])
}

const toggleSelected = (id: string) => {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((item) => item !== id)
    : [...selectedIds.value, id]
}

const switchTab = (
  next: "quickstart" | "settings" | "history" | "knowledge" | "analytics"
) => {
  tab.value = next
  location.hash =
    next === "quickstart"
      ? "#quickstart"
      : next === "history"
        ? "#history"
        : next === "knowledge"
          ? "#knowledge"
          : next === "analytics"
            ? "#analytics"
          : ""
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

const updateProvider = (
  providerId: string,
  updates: Partial<AiModelProfile>
) => {
  if (!settings.value) {
    return
  }

  const next = syncActiveProviderView({
    ...settings.value,
    providers: settings.value.providers.map((provider) =>
      provider.id === providerId ? { ...provider, ...updates } : provider
    )
  })

  updateSettings(next)
}

const switchProvider = (providerId: string) => {
  if (!settings.value) {
    return
  }

  updateSettings(
    syncActiveProviderView({
      ...settings.value,
      activeProviderId: providerId
    })
  )
}

const addProvider = () => {
  if (!settings.value) {
    return
  }

  const nextProvider: AiModelProfile = {
    id: `provider-${Date.now()}`,
    label: `模型 ${settings.value.providers.length + 1}`,
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    model: ""
  }

  updateSettings(
    syncActiveProviderView({
      ...settings.value,
      providers: [...settings.value.providers, nextProvider],
      activeProviderId: nextProvider.id
    })
  )
}

const removeProvider = (providerId: string) => {
  if (!settings.value || settings.value.providers.length <= 1) {
    status.value = "至少保留一个模型配置。"
    return
  }

  const providers = settings.value.providers.filter(
    (provider) => provider.id !== providerId
  )
  const activeProviderId =
    settings.value.activeProviderId === providerId
      ? providers[0].id
      : settings.value.activeProviderId

  updateSettings(
    syncActiveProviderView({
      ...settings.value,
      providers,
      activeProviderId
    })
  )
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

const openGithub = () => {
  window.open(GITHUB_REPO_URL, "_blank", "noopener,noreferrer")
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

const formatKnowledgeTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

const formatDuration = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`

const distributionStyle = (ratio: number) => ({
  width: `${Math.max(ratio * 100, 4)}%`
})

const saveManualExperimentRecord = async () => {
  const explanationValue = Number(manualExplanationSatisfaction.value)
  const interventionValue = Number(manualInterventionSatisfaction.value)

  await sdk.recordExperimentEvent({
    condition: manualCondition.value,
    source: "manual",
    pageType: manualPageType.value,
    steps: Number(manualSteps.value) || 0,
    latencyMs: Number(manualLatencyMs.value) || 0,
    suggestionCount: manualCondition.value === "manual" ? 0 : 3,
    top1Accepted: manualTop1Accepted.value,
    top3Covered: manualTop3Covered.value,
    explanationSatisfaction: Number.isNaN(explanationValue)
      ? undefined
      : explanationValue,
    interventionSatisfaction: Number.isNaN(interventionValue)
      ? undefined
      : interventionValue,
    notes: manualNotes.value
  })

  manualSteps.value = "0"
  manualLatencyMs.value = "0"
  manualTop1Accepted.value = false
  manualTop3Covered.value = false
  manualExplanationSatisfaction.value = ""
  manualInterventionSatisfaction.value = ""
  manualNotes.value = ""
  await loadExperimentEvents()
  analyticsStatus.value = "已补录实验事件。"
}
</script>

<template>
  <main class="page">
    <BaseCard class="panel-head">
      <input
        ref="importInput"
        type="file"
        accept="application/json,.json"
        class="hidden-input"
        @change="importBackup" />
      <div>
        <div class="eyebrow">Workspace</div>
        <div class="title">插件管理台</div>
      </div>
      <div class="tab-actions">
        <BaseButton
          :variant="tab === 'quickstart' ? 'primary' : 'secondary'"
          @click="switchTab('quickstart')">
          <font-awesome-icon icon="book-open" />
          快速开始
        </BaseButton>
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
        <BaseButton
          :variant="tab === 'knowledge' ? 'primary' : 'secondary'"
          @click="switchTab('knowledge')">
          <font-awesome-icon icon="book-open" />
          知识笔记
        </BaseButton>
        <BaseButton
          :variant="tab === 'analytics' ? 'primary' : 'secondary'"
          @click="switchTab('analytics')">
          <font-awesome-icon icon="vector-square" />
          数据看板
        </BaseButton>
        <BaseButton @click="openGithub">
          <font-awesome-icon icon="up-right-from-square" />
          GitHub
        </BaseButton>
      </div>
    </BaseCard>

    <template v-if="!settings">
      <BaseCard>{{ status }}</BaseCard>
    </template>

    <template v-else-if="tab === 'quickstart'">
      <BaseCard class="quickstart-hero">
        <SectionHeader
          compact
          title="快速开始"
          subtitle="先把关键路径走通：模型配置、页面抓取、AI 整理、历史整理和备份导入导出。" />
        <div class="status">
          {{ activeProviderNotice || "当前模型配置完整，可以直接开始使用页面抓取和 AI 整理。" }}
        </div>
      </BaseCard>

      <BaseCard
        v-for="section in quickStartSections"
        :key="section.title"
        class="quickstart-card">
        <div class="quickstart-title">{{ section.title }}</div>
        <div class="quickstart-copy">{{ section.body }}</div>
      </BaseCard>
    </template>

    <template v-else-if="tab === 'settings'">
      <BaseCard>
        <div class="row wrap">
          <SectionHeader
            compact
            title="AI Models"
            subtitle="支持配置多个 OpenAI 兼容模型，并同步给网页 AI 面板使用。" />
          <BaseButton variant="accent" @click="addProvider">
            <font-awesome-icon icon="plus" />
            添加模型
          </BaseButton>
        </div>

        <div class="provider-grid">
          <button
            v-for="provider in settings.providers"
            :key="provider.id"
            class="provider-card"
            :class="{ active: settings.activeProviderId === provider.id }"
            @click="switchProvider(provider.id)">
            <div class="provider-card-top">
              <div>
                <div class="provider-name">{{ provider.label }}</div>
                <div class="provider-model">
                  {{ provider.model || "未填写模型名" }}
                </div>
              </div>
              <div class="provider-tools">
                <span
                  v-if="settings.activeProviderId === provider.id"
                  class="provider-badge">
                  当前
                </span>
                <button
                  v-if="settings.providers.length > 1"
                  class="mini-icon danger"
                  type="button"
                  title="删除模型"
                  @click.stop="removeProvider(provider.id)">
                  <font-awesome-icon icon="trash" />
                </button>
              </div>
            </div>
            <div class="provider-url">{{ provider.baseUrl }}</div>
          </button>
        </div>
      </BaseCard>

      <BaseCard v-if="activeProvider">
        <SectionHeader compact title="当前模型编辑" />
        <div v-if="activeProviderNotice" class="config-notice">
          {{ activeProviderNotice }}
        </div>
        <FormField label="展示名称">
          <input
            class="field"
            :value="activeProvider.label"
            @input="
              updateProvider(activeProvider.id, { label: readInputValue($event) })
            " />
        </FormField>
        <FormField label="接口基地址">
          <input
            class="field"
            :value="activeProvider.baseUrl"
            @input="
              updateProvider(activeProvider.id, { baseUrl: readInputValue($event) })
            " />
        </FormField>
        <FormField label="模型名称">
          <input
            class="field"
            :value="activeProvider.model"
            @input="
              updateProvider(activeProvider.id, { model: readInputValue($event) })
            " />
        </FormField>
        <FormField label="API Key">
          <div class="secret-field">
            <input
              class="field secret-input"
              :type="showApiKey ? 'text' : 'password'"
              :value="activeProvider.apiKey"
              @input="
                updateProvider(activeProvider.id, { apiKey: readInputValue($event) })
              " />
            <button
              v-if="activeProvider.apiKey"
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
        <label class="check-item">
          <input
            type="checkbox"
            :checked="settings.behavior.allowCreateFolder"
            @change="onAllowCreateFolderChange" />
          允许推荐创建新文件夹
        </label>
        <label class="check-item">
          <input
            type="checkbox"
            :checked="settings.behavior.preferExistingFolder"
            @change="onPreferExistingFolderChange" />
          优先推荐已有结构，降低新建文件夹频率
        </label>
        <label class="check-item">
          <input
            type="checkbox"
            :checked="settings.behavior.storeKnowledge"
            @change="onStoreKnowledgeChange" />
          保存页面摘要、标签和推荐结果到本地知识库
        </label>
      </BaseCard>

      <BaseCard class="actions">
        <div class="status">{{ status }}</div>
        <div class="button-row">
          <BaseButton @click="exportBackup">
            <font-awesome-icon icon="file-export" />
            导出备份
          </BaseButton>
          <BaseButton @click="triggerImportBackup">
            <font-awesome-icon icon="folder-open" />
            导入备份
          </BaseButton>
          <BaseButton @click="openGithub">
            <font-awesome-icon icon="up-right-from-square" />
            GitHub
          </BaseButton>
          <BaseButton variant="primary" @click="saveSettings">
            <font-awesome-icon icon="floppy-disk" />
            保存配置
          </BaseButton>
        </div>
      </BaseCard>
    </template>

    <template v-else-if="tab === 'history'">
      <BaseCard class="history-header">
        <div>
          <SectionHeader compact title="历史整理" />
          <div class="status">{{ collectionsStatus }}</div>
        </div>
        <div class="button-row">
          <BaseButton @click="openGithub">
            <font-awesome-icon icon="up-right-from-square" />
            GitHub
          </BaseButton>
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

    <template v-else-if="tab === 'knowledge'">
      <BaseCard class="history-header">
        <div>
          <SectionHeader compact title="知识笔记库" />
          <div class="status">{{ knowledgeStatus }}</div>
        </div>
        <div class="button-row">
          <BaseButton @click="loadKnowledgeRecords">
            <font-awesome-icon icon="arrows-rotate" />
            刷新记录
          </BaseButton>
        </div>
      </BaseCard>

      <BaseCard>
        <div class="metrics-grid compact-grid">
          <div
            v-for="card in knowledgeInsightCards"
            :key="card.label"
            class="metric-panel">
            <div class="metric-label">{{ card.label }}</div>
            <div class="metric-value">{{ card.value }}</div>
          </div>
        </div>
      </BaseCard>

      <BaseCard>
        <div class="analytics-columns">
          <div>
            <div class="quickstart-title">目录分布</div>
            <div
              v-for="item in analyticsSummary.folderDistribution"
              :key="item.label"
              class="distribution-item">
              <div class="distribution-head">
                <span>{{ item.label }}</span>
                <span>{{ item.count }} · {{ formatPercent(item.ratio) }}</span>
              </div>
              <div class="distribution-track">
                <div class="distribution-fill" :style="distributionStyle(item.ratio)" />
              </div>
            </div>
          </div>
          <div>
            <div class="quickstart-title">标签频率</div>
            <div
              v-for="item in analyticsSummary.tagDistribution"
              :key="item.label"
              class="distribution-item">
              <div class="distribution-head">
                <span>{{ item.label }}</span>
                <span>{{ item.count }} · {{ formatPercent(item.ratio) }}</span>
              </div>
              <div class="distribution-track">
                <div class="distribution-fill warm" :style="distributionStyle(item.ratio)" />
              </div>
            </div>
          </div>
        </div>
      </BaseCard>

      <BaseCard>
        <div class="knowledge-toolbar">
          <input
            v-model="knowledgeQuery"
            class="field"
            placeholder="搜索标题、标签、来源网址、目录路径或备注" />
          <div class="status">
            当前显示 {{ filteredKnowledgeRecords.length }} / {{ knowledgeRecords.length }} 条
          </div>
        </div>
      </BaseCard>

      <BaseCard v-if="filteredKnowledgeRecords.length === 0" class="soft-empty">
        没有匹配的知识记录。可以先在浏览器中执行一次收藏确认，或换一个搜索词。
      </BaseCard>

      <BaseCard
        v-for="record in filteredKnowledgeRecords"
        :key="`${record.createdAt}-${record.url}`"
        class="knowledge-card">
        <div class="knowledge-head">
          <div>
            <div class="knowledge-title">{{ record.title }}</div>
            <div class="knowledge-url">{{ record.url }}</div>
          </div>
          <div class="knowledge-time">{{ formatKnowledgeTime(record.createdAt) }}</div>
        </div>
        <div class="knowledge-meta">
          <span>目录：{{ record.folderPath || "未记录" }}</span>
          <span>来源：{{ record.source }}</span>
        </div>
        <div v-if="record.tags.length" class="tag-row">
          <span v-for="tag in record.tags" :key="tag" class="tag-chip">{{ tag }}</span>
        </div>
        <div v-if="record.notes" class="knowledge-block">
          <div class="knowledge-label">备注</div>
          <div>{{ record.notes }}</div>
        </div>
        <div v-if="record.selectedText" class="knowledge-block">
          <div class="knowledge-label">选中片段</div>
          <div class="knowledge-quote">{{ record.selectedText }}</div>
        </div>
      </BaseCard>
    </template>
    <template v-else>
      <BaseCard class="history-header">
        <div>
          <SectionHeader compact title="数据看板" />
          <div class="status">{{ analyticsStatus }}</div>
        </div>
        <div class="button-row">
          <BaseButton @click="loadExperimentEvents">
            <font-awesome-icon icon="arrows-rotate" />
            刷新统计
          </BaseButton>
        </div>
      </BaseCard>

      <BaseCard>
        <div class="metrics-grid compact-grid">
          <div class="metric-panel">
            <div class="metric-label">实验事件</div>
            <div class="metric-value">{{ analyticsSummary.totalEvents }}</div>
          </div>
          <div class="metric-panel">
            <div class="metric-label">知识记录</div>
            <div class="metric-value">{{ analyticsSummary.totalKnowledgeRecords }}</div>
          </div>
          <div class="metric-panel">
            <div class="metric-label">唯一页面</div>
            <div class="metric-value">{{ analyticsSummary.uniquePages }}</div>
          </div>
        </div>
      </BaseCard>

      <BaseCard>
        <div class="table-scroll">
          <table class="stats-table">
            <thead>
              <tr>
                <th>条件</th>
                <th>任务数</th>
                <th>Top-1</th>
                <th>Top-3</th>
                <th>平均步数</th>
                <th>平均时延</th>
                <th>解释满意度</th>
                <th>可干预满意度</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in analyticsSummary.conditionRows" :key="row.condition">
                <td>{{ row.condition }}</td>
                <td>{{ row.total }}</td>
                <td>{{ formatPercent(row.top1Rate) }}</td>
                <td>{{ formatPercent(row.top3Rate) }}</td>
                <td>{{ row.avgSteps.toFixed(2) }}</td>
                <td>{{ formatDuration(row.avgLatencyMs) }}</td>
                <td>{{ row.avgExplanationSatisfaction?.toFixed(2) || "-" }}</td>
                <td>{{ row.avgInterventionSatisfaction?.toFixed(2) || "-" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </BaseCard>

      <BaseCard>
        <div class="analytics-columns">
          <div class="folder-form">
            <div class="quickstart-title">实验补录</div>
            <select v-model="manualCondition" class="field">
              <option value="manual">manual</option>
              <option value="rule">rule</option>
              <option value="enhanced">enhanced</option>
            </select>
            <select v-model="manualPageType" class="field">
              <option value="unknown">unknown</option>
              <option value="structured">structured</option>
              <option value="semi-structured">semi-structured</option>
              <option value="high-noise">high-noise</option>
            </select>
            <input v-model="manualSteps" class="field" placeholder="整理步数" />
            <input v-model="manualLatencyMs" class="field" placeholder="处理时延 ms" />
            <input v-model="manualExplanationSatisfaction" class="field" placeholder="解释满意度 1-5" />
            <input v-model="manualInterventionSatisfaction" class="field" placeholder="可干预满意度 1-5" />
            <label class="check-item">
              <input v-model="manualTop1Accepted" type="checkbox" />
              <span>Top-1 被采纳</span>
            </label>
            <label class="check-item">
              <input v-model="manualTop3Covered" type="checkbox" />
              <span>Top-3 覆盖命中</span>
            </label>
            <textarea v-model="manualNotes" class="field" rows="4" placeholder="参与者编号、任务编号或备注" />
            <BaseButton variant="primary" @click="saveManualExperimentRecord">
              <font-awesome-icon icon="floppy-disk" />
              保存补录
            </BaseButton>
          </div>
          <div>
            <div class="quickstart-title">最近事件</div>
            <div v-for="event in experimentEvents.slice(0, 10)" :key="event.id" class="event-card">
              <div class="folder-item-top">
                <div>
                  <div class="folder-name">{{ event.pageTitle || "手工补录任务" }}</div>
                  <div class="folder-desc">
                    {{ event.condition }} / {{ event.source }} / {{ formatKnowledgeTime(event.createdAt) }}
                  </div>
                </div>
                <span class="tag-chip">{{ event.pageType || "unknown" }}</span>
              </div>
              <div class="knowledge-meta">
                <span>步数：{{ event.steps }}</span>
                <span>时延：{{ formatDuration(event.latencyMs) }}</span>
                <span>Top-1：{{ event.top1Accepted ? "是" : "否" }}</span>
                <span>Top-3：{{ event.top3Covered ? "是" : "否" }}</span>
              </div>
            </div>
          </div>
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
.button-row,
.provider-tools {
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

.hidden-input {
  display: none;
}

.config-notice,
.quickstart-hero,
.quickstart-card {
  background: linear-gradient(135deg, rgba(255, 247, 224, 0.9), rgba(245, 250, 255, 0.96));
}

.config-notice {
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid rgba(235, 186, 92, 0.22);
  color: #7a5a18;
  line-height: 1.7;
}

.quickstart-title {
  font-size: 18px;
  font-weight: 800;
  color: #22314f;
}

.quickstart-copy {
  margin-top: 10px;
  color: #5f6f89;
  line-height: 1.8;
}

.provider-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--sf-space-3);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--sf-space-3);
}

.compact-grid {
  max-width: 1180px;
}

.metric-panel,
.event-card {
  border: 1px solid rgba(124, 148, 188, 0.16);
  border-radius: 18px;
  padding: 16px;
  background: linear-gradient(180deg, #fff, #f9fbff);
}

.metric-label {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7b8ab1;
}

.metric-value {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 800;
  color: #24324c;
}

.analytics-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--sf-space-4);
}

.distribution-item {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.distribution-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #607089;
  font-size: 13px;
}

.distribution-track {
  height: 10px;
  border-radius: 999px;
  background: #edf3fb;
  overflow: hidden;
}

.distribution-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #6f95ff 0%, #59bfff 100%);
}

.distribution-fill.warm {
  background: linear-gradient(90deg, #ffb56b 0%, #ff7f92 100%);
}

.table-scroll {
  overflow-x: auto;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
}

.stats-table th,
.stats-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #dfe8f4;
  text-align: left;
}

.stats-table th {
  color: #607089;
  font-size: 13px;
}

.provider-card {
  width: 100%;
  border: 1px solid rgba(123, 153, 205, 0.18);
  border-radius: 18px;
  padding: 16px;
  background: linear-gradient(180deg, #fff, #f9fbff);
  text-align: left;
  cursor: pointer;
}

.provider-card.active {
  border-color: rgba(104, 147, 255, 0.42);
  box-shadow: 0 12px 24px rgba(97, 129, 184, 0.12);
  background: linear-gradient(135deg, rgba(255, 236, 247, 0.92), rgba(236, 248, 255, 0.98));
}

.provider-card-top {
  display: flex;
  justify-content: space-between;
  gap: var(--sf-space-3);
  align-items: flex-start;
}

.provider-name {
  font-size: 15px;
  font-weight: 800;
  color: #23324d;
}

.provider-model,
.provider-url {
  margin-top: 4px;
  color: #6f809d;
  font-size: 12px;
  line-height: 1.6;
  word-break: break-all;
}

.provider-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: #edf4ff;
  color: #5570a1;
  font-size: 12px;
  font-weight: 800;
}

.mini-icon {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 0;
  background: #f0f4fb;
  color: #5a6e97;
  cursor: pointer;
}

.mini-icon.danger {
  background: #ffe9ed;
  color: #ca3654;
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

.knowledge-toolbar {
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

.knowledge-card {
  display: grid;
  gap: 14px;
}

.knowledge-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.knowledge-title {
  font-size: 18px;
  font-weight: 800;
  color: #22314f;
}

.knowledge-url {
  margin-top: 6px;
  color: #6f809d;
  word-break: break-all;
  font-size: 13px;
}

.knowledge-time {
  color: #7b8ab1;
  font-size: 12px;
  white-space: nowrap;
}

.knowledge-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  color: #607089;
  font-size: 13px;
}

.knowledge-block {
  display: grid;
  gap: 6px;
  padding: 14px;
  border-radius: 16px;
  background: #f7faff;
  color: #24314a;
  line-height: 1.7;
}

.knowledge-label {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7b8ab1;
}

.knowledge-quote {
  white-space: pre-wrap;
}

.tag-row {
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
  .history-header,
  .knowledge-head {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
