import type { BookmarkFolder } from "./bookmarks"
import type { SnippetCollectionState } from "./bookmarks"
import type { PageCaptureDraft } from "./page"

export interface AiProviderSettings {
  baseUrl: string
  apiKey: string
  model: string
}

export interface AiModelProfile extends AiProviderSettings {
  id: string
  label: string
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
  providers: AiModelProfile[]
  activeProviderId: string
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

export interface ExportSnapshot {
  exportedAt: string
  settings: SmartFavoritesSettings
  knowledge: KnowledgeRecord[]
  folders: BookmarkFolder[]
  drafts: PageCaptureDraft[]
  collections: SnippetCollectionState
}
