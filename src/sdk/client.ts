import type {
  ApplyBookmarkPayload,
  BookmarkItem,
  BookmarkMoveDecision,
  BookmarkMutationResult,
  BulkBookmarkApplyResult,
  CapturePageResponse,
  CapturedSnippet,
  ExportSnapshot,
  HistoryRecommendationItem,
  RecommendationInput,
  RecommendationResult,
  SmartFavoritesSettings
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
}
