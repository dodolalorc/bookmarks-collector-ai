import type {
  ApplyBookmarkPayload,
  BookmarkItem,
  BookmarkMoveDecision,
  BookmarkMutationResult,
  BulkBookmarkApplyResult,
  CapturePageResponse,
  CollectionFolderMutationResult,
  CollectionItemMutationResult,
  CapturedSnippet,
  CreateCollectionItemPayload,
  CreateCollectionFolderPayload,
  DeleteCollectionFolderPayload,
  DeleteCollectionItemPayload,
  ExportSnapshot,
  HistoryRecommendationItem,
  MoveCollectionItemPayload,
  RecommendationInput,
  RecommendationResult,
  SnippetCollectionState,
  SmartFavoritesSettings,
  UpdateCollectionFolderPayload,
  UpdateCollectionItemPayload
} from "~/src/sdk/types"

async function sendRuntimeMessage<T>(type: string, payload?: unknown): Promise<T> {
  const response = await chrome.runtime.sendMessage({
    type,
    payload
  })

  if (!response?.ok) {
    throw new Error(response?.error || "Runtime message failed")
  }

  return response.payload as T
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  })

  return tab
}

export class SmartFavoritesSDK {
  async getSettings() {
    return sendRuntimeMessage<SmartFavoritesSettings>(
      "smart-favorites/get-settings"
    )
  }

  async saveSettings(settings: SmartFavoritesSettings) {
    return sendRuntimeMessage<{ success: boolean }>(
      "smart-favorites/save-settings",
      settings
    )
  }

  async captureActivePage(): Promise<CapturePageResponse> {
    const tab = await getActiveTab()

    if (!tab?.id || !tab.url) {
      throw new Error("当前没有可读取的网页标签页。")
    }

    if (
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("edge://") ||
      tab.url.startsWith("about:")
    ) {
      return {
        page: {
          title: tab.title || "系统页面",
          url: tab.url,
          domain: "system-page",
          summary: ""
        },
        selectionText: "",
        snippets: [],
        extractedAt: new Date().toISOString()
      }
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "smart-favorites/capture-page"
    })

    if (!response?.page) {
      throw new Error("无法从当前页面抓取内容，请刷新页面后重试。")
    }

    return response as CapturePageResponse
  }

  async recommendFolders(input: RecommendationInput) {
    return sendRuntimeMessage<RecommendationResult>(
      "smart-favorites/recommend",
      input
    )
  }

  async applyBookmarkRecommendation(payload: ApplyBookmarkPayload) {
    return sendRuntimeMessage<BookmarkMutationResult>(
      "smart-favorites/apply-bookmark",
      payload
    )
  }

  async exportSnapshot() {
    return sendRuntimeMessage<ExportSnapshot>("smart-favorites/export-snapshot")
  }

  async listHistoryBookmarks(limit = 40) {
    return sendRuntimeMessage<HistoryRecommendationItem[]>(
      "smart-favorites/list-history-bookmarks",
      { limit }
    )
  }

  async applyBulkBookmarkRecommendations(decisions: BookmarkMoveDecision[]) {
    return sendRuntimeMessage<BulkBookmarkApplyResult>(
      "smart-favorites/apply-bulk-bookmarks",
      { decisions }
    )
  }

  async openExtensionPage(path: string) {
    return sendRuntimeMessage<{ success: boolean }>(
      "smart-favorites/open-extension-page",
      { path }
    )
  }

  async getSnippetCollections() {
    return sendRuntimeMessage<SnippetCollectionState>(
      "smart-favorites/get-snippet-collections"
    )
  }

  async createSnippetFolder(payload: CreateCollectionFolderPayload) {
    return sendRuntimeMessage<CollectionFolderMutationResult>(
      "smart-favorites/create-snippet-folder",
      payload
    )
  }

  async updateSnippetFolder(payload: UpdateCollectionFolderPayload) {
    return sendRuntimeMessage<CollectionFolderMutationResult>(
      "smart-favorites/update-snippet-folder",
      payload
    )
  }

  async deleteSnippetFolder(payload: DeleteCollectionFolderPayload) {
    return sendRuntimeMessage<CollectionFolderMutationResult>(
      "smart-favorites/delete-snippet-folder",
      payload
    )
  }

  async updateSnippetCollectionItem(payload: UpdateCollectionItemPayload) {
    return sendRuntimeMessage<CollectionItemMutationResult>(
      "smart-favorites/update-snippet-item",
      payload
    )
  }

  async createSnippetCollectionItem(payload: CreateCollectionItemPayload) {
    return sendRuntimeMessage<CollectionItemMutationResult>(
      "smart-favorites/create-snippet-item",
      payload
    )
  }

  async moveSnippetCollectionItem(payload: MoveCollectionItemPayload) {
    return sendRuntimeMessage<CollectionItemMutationResult>(
      "smart-favorites/move-snippet-item",
      payload
    )
  }

  async deleteSnippetCollectionItem(payload: DeleteCollectionItemPayload) {
    return sendRuntimeMessage<CollectionItemMutationResult>(
      "smart-favorites/delete-snippet-item",
      payload
    )
  }
}
