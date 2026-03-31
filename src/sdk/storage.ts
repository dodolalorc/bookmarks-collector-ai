import { DEFAULT_SETTINGS, STORAGE_KEYS } from "~/src/sdk/constants"
import type {
  CapturedSnippet,
  KnowledgeRecord,
  PageCaptureDraft,
  SmartFavoritesSettings
} from "~/src/sdk/types"

async function getLocal<T>(key: string, fallback: T): Promise<T> {
  const result = await chrome.storage.local.get(key)
  return (result[key] as T | undefined) ?? fallback
}

export async function getSettings(): Promise<SmartFavoritesSettings> {
  const settings = await getLocal(STORAGE_KEYS.settings, DEFAULT_SETTINGS)
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    provider: {
      ...DEFAULT_SETTINGS.provider,
      ...settings.provider
    },
    prompts: {
      ...DEFAULT_SETTINGS.prompts,
      ...settings.prompts
    },
    behavior: {
      ...DEFAULT_SETTINGS.behavior,
      ...settings.behavior
    }
  }
}

export async function saveSettings(settings: SmartFavoritesSettings) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.settings]: settings
  })
}

export async function getKnowledgeRecords(): Promise<KnowledgeRecord[]> {
  return getLocal<KnowledgeRecord[]>(STORAGE_KEYS.knowledge, [])
}

export async function pushKnowledgeRecord(record: KnowledgeRecord) {
  const current = await getKnowledgeRecords()
  const next = [record, ...current].slice(0, 300)
  await chrome.storage.local.set({
    [STORAGE_KEYS.knowledge]: next
  })
}

async function getDraftMap() {
  return getLocal<Record<string, PageCaptureDraft>>(STORAGE_KEYS.drafts, {})
}

export async function getAllCaptureDrafts(): Promise<PageCaptureDraft[]> {
  const draftMap = await getDraftMap()
  return Object.values(draftMap)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 100)
}

export async function getCaptureDraft(url: string): Promise<PageCaptureDraft> {
  const draftMap = await getDraftMap()
  return (
    draftMap[url] ?? {
      url,
      snippets: [],
      updatedAt: new Date().toISOString()
    }
  )
}

export async function addCapturedSnippet(url: string, snippet: CapturedSnippet) {
  const draftMap = await getDraftMap()
  const current = draftMap[url] ?? {
    url,
    snippets: [],
    updatedAt: new Date().toISOString()
  }

  draftMap[url] = {
    url,
    snippets: [snippet, ...current.snippets].slice(0, 20),
    updatedAt: new Date().toISOString()
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.drafts]: draftMap
  })

  return draftMap[url]
}

export async function removeCapturedSnippet(url: string, snippetId: string) {
  const draftMap = await getDraftMap()
  const current = draftMap[url]

  if (!current) {
    return {
      url,
      snippets: [],
      updatedAt: new Date().toISOString()
    }
  }

  draftMap[url] = {
    url,
    snippets: current.snippets.filter((snippet) => snippet.id !== snippetId),
    updatedAt: new Date().toISOString()
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.drafts]: draftMap
  })

  return draftMap[url]
}

export async function clearCaptureDraft(url: string) {
  const draftMap = await getDraftMap()
  delete draftMap[url]

  await chrome.storage.local.set({
    [STORAGE_KEYS.drafts]: draftMap
  })
}
