export type RecommendationSource = "heuristic" | "ai"

export interface PageContext {
  title: string
  url: string
  domain: string
  description?: string
  summary?: string
}

export interface CapturePageResponse {
  page: PageContext
  selectionText?: string
  snippets: CapturedSnippet[]
  extractedAt: string
}

export interface CapturedSnippet {
  id: string
  mode: "selection" | "element"
  text: string
  label: string
  selector?: string
  createdAt: string
}

export interface PageCaptureDraft {
  url: string
  snippets: CapturedSnippet[]
  updatedAt: string
}

export interface RecommendationInput {
  page: PageContext
  selectedText?: string
  tags: string[]
  notes?: string
}

export interface BookmarkFolder {
  id: string
  title: string
  parentId?: string
  path: string
  bookmarkCount: number
  sampleTitles: string[]
}

export interface FolderIndex {
  folders: BookmarkFolder[]
}

export interface BookmarkItem {
  id: string
  title: string
  url: string
  parentId?: string
  parentPath: string
  dateAdded?: number
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

export interface AiProviderSettings {
  baseUrl: string
  apiKey: string
  model: string
}

export interface PromptSettings {
  system: string
  template: string
}

export interface BehaviorSettings {
  allowCreateFolder: boolean
  preferExistingFolder: boolean
  storeKnowledge: boolean
}

export interface SmartFavoritesSettings {
  provider: AiProviderSettings
  prompts: PromptSettings
  behavior: BehaviorSettings
}

export interface KnowledgeRecord {
  createdAt: string
  title: string
  url: string
  folderPath: string
  tags: string[]
  selectedText?: string
  notes?: string
  source: string
}

export interface ApplyBookmarkPayload {
  page: PageContext
  input: RecommendationInput
  recommendation: FolderSuggestion
}

export interface BookmarkMutationResult {
  folderPath: string
  bookmark: chrome.bookmarks.BookmarkTreeNode
  message: string
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

export interface ExtensionPageOpenPayload {
  path: string
}

export interface ExportSnapshot {
  exportedAt: string
  settings: SmartFavoritesSettings
  knowledge: KnowledgeRecord[]
  folders: BookmarkFolder[]
  drafts: PageCaptureDraft[]
}
