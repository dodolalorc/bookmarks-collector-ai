import {
  applyBookmarkDecision,
  applyBulkBookmarkDecisions,
  buildExportSnapshot,
  buildFolderIndex,
  listBookmarks
} from "~/src/sdk/bookmarks"
import { recommendFolders } from "~/src/sdk/folder-recommender"
import {
  analyzeSnippetContent,
  extractAiRecommendations
} from "~/src/sdk/provider"
import {
  addCapturedSnippet,
  clearCaptureDraft,
  getCaptureDraft,
  getSettings,
  pushKnowledgeRecord,
  removeCapturedSnippet,
  saveSettings,
  updateCapturedSnippet
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

chrome.bookmarks.onCreated.addListener((_, node) => {
  if (!node.url?.startsWith("http")) {
    return
  }

  void notifyBookmarkCreated(node.url)
})

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
    case "smart-favorites/analyze-captured-snippet":
      return handleAnalyzeCapturedSnippet(
        message.payload as {
          url: string
          snippetId: string
        }
      )
    case "smart-favorites/analyze-all-captured-snippets":
      return handleAnalyzeAllCapturedSnippets(
        message.payload as {
          url: string
          force?: boolean
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
  const normalizedPath = payload.path?.trim()

  if (!normalizedPath) {
    throw new Error("页面路径不能为空")
  }

  if (normalizedPath === "internal://model") {
    await chrome.tabs.create({ url: chrome.runtime.getURL("tabs/manage.html") })
    return { success: true }
  }

  if (normalizedPath === "internal://bookmarks") {
    await chrome.tabs.create({
      url: chrome.runtime.getURL("tabs/manage.html#history")
    })
    return { success: true }
  }

  if (normalizedPath.startsWith("options.html")) {
    const optionsUrl = chrome.runtime.getURL(normalizedPath)

    if (normalizedPath === "options.html") {
      try {
        await chrome.runtime.openOptionsPage()
        return { success: true }
      } catch {
        await chrome.tabs.create({ url: optionsUrl })
        return { success: true }
      }
    }

    await chrome.tabs.create({ url: optionsUrl })
    return { success: true }
  }

  const url = chrome.runtime.getURL(normalizedPath)
  await chrome.tabs.create({ url })
  return { success: true }
}

async function handleAnalyzeCapturedSnippet(payload: {
  url: string
  snippetId: string
}): Promise<PageCaptureDraft> {
  const draft = await getCaptureDraft(payload.url)
  const target = draft.snippets.find((snippet) => snippet.id === payload.snippetId)

  if (!target) {
    return draft
  }

  const settings = await getSettings()
  const analysis = await analyzeSnippetContent(target.text, settings)

  return updateCapturedSnippet(payload.url, payload.snippetId, (snippet) => ({
    ...snippet,
    analysisSummary: analysis.summary,
    analysisTags: analysis.tags,
    analysisUpdatedAt: new Date().toISOString()
  }))
}

async function handleAnalyzeAllCapturedSnippets(payload: {
  url: string
  force?: boolean
}): Promise<PageCaptureDraft> {
  const draft = await getCaptureDraft(payload.url)
  const settings = await getSettings()

  let nextDraft = draft

  for (const snippet of draft.snippets) {
    if (!payload.force && snippet.analysisSummary && snippet.analysisTags?.length) {
      continue
    }

    const analysis = await analyzeSnippetContent(snippet.text, settings)
    nextDraft = await updateCapturedSnippet(payload.url, snippet.id, (current) => ({
      ...current,
      analysisSummary: analysis.summary,
      analysisTags: analysis.tags,
      analysisUpdatedAt: new Date().toISOString()
    }))
  }

  return nextDraft
}

async function notifyBookmarkCreated(url: string) {
  const matchedTabs = await chrome.tabs.query({
    url
  })

  await Promise.all(
    matchedTabs
      .filter((tab) => typeof tab.id === "number")
      .map((tab) =>
        chrome.tabs.sendMessage(tab.id as number, {
          type: "smart-favorites/bookmark-created"
        }).catch(() => undefined)
      )
  )
}
