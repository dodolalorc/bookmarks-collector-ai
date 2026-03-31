import type { BookmarkItem, BookmarkMutationResult } from "./bookmarks"
import type { PageContext } from "./page"

export type RecommendationSource = "heuristic" | "ai"

export interface RecommendationInput {
    page: PageContext
    selectedText?: string
    tags: string[]
    notes?: string
}

export interface FolderSuggestion {
    key: string
    type: "existing" | "create"
    folderId?: string
    title: string
    path: string
    score: number
    reason: string
}

export interface RecommendationResult {
    source: RecommendationSource
    suggestions: FolderSuggestion[]
}

export interface ApplyBookmarkPayload {
    page: PageContext
    input: RecommendationInput
    recommendation: FolderSuggestion
}

export interface HistoryRecommendationItem {
    bookmark: BookmarkItem
    recommendation: RecommendationResult
}

export interface HistoryRecommendationRequest {
    bookmarkIds?: string[]
    limit?: number
}

export interface BookmarkMoveDecision {
    bookmarkId: string
    recommendation: FolderSuggestion
}

export interface BulkBookmarkApplyPayload {
    decisions: BookmarkMoveDecision[]
}

export interface BulkBookmarkApplyResult {
    moved: number
    results: BookmarkMutationResult[]
}
