import {
  applyBookmarkDecision,
  applyBulkBookmarkDecisions,
  buildExportSnapshot,
  buildFolderIndex,
  listBookmarks
} from "~/src/sdk/bookmarks"
import { recommendFolders } from "~/src/sdk/folder-recommender"
import { extractAiRecommendations } from "~/src/sdk/provider"
import {
  addCapturedSnippet,
  clearCaptureDraft,
  getCaptureDraft,
  getSettings,
  pushKnowledgeRecord,
  removeCapturedSnippet,
  saveSettings
} from "~/src/sdk/storage"
import type {
  ApplyBookmarkPayload,
  BookmarkMoveDecision,
  BulkBookmarkApplyPayload,
  BulkBookmarkApplyResult,
  CapturedSnippet,
  ExtensionPageOpenPayload,
  ExportSnapshot,
  HistoryRecommendationItem,
  HistoryRecommendationRequest,
  PageCaptureDraft,
  RecommendationInput,
  RecommendationResult,
  SmartFavoritesSettings
} from "~/src/sdk/types"

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void handleMessage(message)
    .then((payload) => sendResponse({ ok: true, payload }))
    .catch((error) => {
      const fallback =
        error instanceof Error ? error.message : "Unknown background error"
      sendResponse({ ok: false, error: fallback })
    })

  return true
})

async function handleMessage(message: { type: string; payload?: unknown }) {
  switch (message.type) {
    case "smart-favorites/get-settings":
      return getSettings()
    case "smart-favorites/save-settings":
      await saveSettings(message.payload as SmartFavoritesSettings)
      return { success: true }
    case "smart-favorites/recommend":
      return handleRecommendation(message.payload as RecommendationInput)
    case "smart-favorites/apply-bookmark":
      return handleApplyBookmark(message.payload as ApplyBookmarkPayload)
    case "smart-favorites/export-snapshot":
      return handleExport()
    case "smart-favorites/get-capture-draft":
      return getCaptureDraft(message.payload as string)
    case "smart-favorites/add-captured-snippet":
      return handleAddCapturedSnippet(
        message.payload as {
          url: string
          snippet: CapturedSnippet
        }
      )
    case "smart-favorites/remove-captured-snippet":
      return handleRemoveCapturedSnippet(
        message.payload as {
          url: string
          snippetId: string
        }
      )
    case "smart-favorites/clear-capture-draft":
      await clearCaptureDraft(message.payload as string)
      return { success: true }
    case "smart-favorites/list-history-bookmarks":
      return handleListHistoryBookmarks(
        message.payload as HistoryRecommendationRequest | undefined
      )
    case "smart-favorites/apply-bulk-bookmarks":
      return handleApplyBulkBookmarks(message.payload as BulkBookmarkApplyPayload)
    case "smart-favorites/open-extension-page":
      return handleOpenExtensionPage(message.payload as ExtensionPageOpenPayload)
    default:
      throw new Error(`Unsupported message type: ${message.type}`)
  }
}

async function handleRecommendation(
  input: RecommendationInput
): Promise<RecommendationResult> {
  const [settings, folderIndex] = await Promise.all([
    getSettings(),
    buildFolderIndex()
  ])

  const baseRecommendation = recommendFolders(input, folderIndex, settings)

  if (
    !settings.provider.apiKey ||
    !settings.provider.baseUrl ||
    !settings.provider.model
  ) {
    return baseRecommendation
  }

  try {
    const aiRecommendation = await extractAiRecommendations(
      input,
      folderIndex,
      settings,
      baseRecommendation
    )

    if (aiRecommendation.suggestions.length > 0) {
      return aiRecommendation
    }
  } catch (_error) {
    return {
      ...baseRecommendation,
      source: "heuristic"
    }
  }

  return baseRecommendation
}

async function handleApplyBookmark(payload: ApplyBookmarkPayload) {
  const result = await applyBookmarkDecision(payload)
  const settings = await getSettings()

  if (settings.behavior.storeKnowledge) {
    await pushKnowledgeRecord({
      createdAt: new Date().toISOString(),
      title: payload.page.title,
      url: payload.page.url,
      folderPath: result.folderPath,
      tags: payload.input.tags,
      selectedText: payload.input.selectedText,
      notes: payload.input.notes,
      source: payload.recommendation.type
    })
  }

  return result
}

async function handleExport(): Promise<ExportSnapshot> {
  const [settings, folderIndex] = await Promise.all([
    getSettings(),
    buildFolderIndex()
  ])

  return buildExportSnapshot(settings, folderIndex)
}

async function handleAddCapturedSnippet(payload: {
  url: string
  snippet: CapturedSnippet
}): Promise<PageCaptureDraft> {
  return addCapturedSnippet(payload.url, payload.snippet)
}

async function handleRemoveCapturedSnippet(payload: {
  url: string
  snippetId: string
}): Promise<PageCaptureDraft> {
  return removeCapturedSnippet(payload.url, payload.snippetId)
}

async function handleListHistoryBookmarks(
  request?: HistoryRecommendationRequest
): Promise<HistoryRecommendationItem[]> {
  const [bookmarks, folderIndex, settings] = await Promise.all([
    listBookmarks(request?.limit ?? 40),
    buildFolderIndex(),
    getSettings()
  ])

  const selectedBookmarks = request?.bookmarkIds?.length
    ? bookmarks.filter((item) => request.bookmarkIds?.includes(item.id))
    : bookmarks

  return selectedBookmarks.map((bookmark) => ({
    bookmark,
    recommendation: recommendFolders(
      {
        page: {
          title: bookmark.title,
          url: bookmark.url,
          domain: new URL(bookmark.url).hostname,
          summary: bookmark.parentPath
        },
        tags: [],
        notes: bookmark.parentPath
      },
      folderIndex,
      settings
    )
  }))
}

async function handleApplyBulkBookmarks(
  payload: BulkBookmarkApplyPayload
): Promise<BulkBookmarkApplyResult> {
  const decisions: BookmarkMoveDecision[] = payload.decisions
  return applyBulkBookmarkDecisions(decisions)
}

async function handleOpenExtensionPage(payload: ExtensionPageOpenPayload) {
  const url = chrome.runtime.getURL(payload.path)
  await chrome.tabs.create({ url })
  return { success: true }
}
