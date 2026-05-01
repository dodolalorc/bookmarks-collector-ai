import { STORAGE_KEYS } from "~/src/sdk/constants"
import type { KnowledgeItem, KnowledgeQuery } from "~/src/types/knowledge"

async function getLocal<T>(key: string, fallback: T): Promise<T> {
    const result = await chrome.storage.local.get(key)
    return (result[key] as T | undefined) ?? fallback
}

async function getAllItems(): Promise<KnowledgeItem[]> {
    return getLocal<KnowledgeItem[]>(STORAGE_KEYS.knowledgeItems, [])
}

async function saveAllItems(items: KnowledgeItem[]): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.knowledgeItems]: items })
}

function generateId(): string {
    return `ki-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const knowledgeStorage = {
    async create(
        payload: Omit<KnowledgeItem, "id" | "createdAt" | "updatedAt">
    ): Promise<KnowledgeItem> {
        const now = Date.now()
        const item: KnowledgeItem = {
            ...payload,
            id: generateId(),
            createdAt: now,
            updatedAt: now
        }
        const items = await getAllItems()
        items.unshift(item)
        await saveAllItems(items)
        return item
    },

    async update(id: string, patch: Partial<KnowledgeItem>): Promise<KnowledgeItem | null> {
        const items = await getAllItems()
        const index = items.findIndex((item) => item.id === id)
        if (index === -1) return null

        const updated = { ...items[index], ...patch, id, updatedAt: Date.now() }
        items[index] = updated
        await saveAllItems(items)
        return updated
    },

    async delete(id: string): Promise<boolean> {
        const items = await getAllItems()
        const filtered = items.filter((item) => item.id !== id)
        if (filtered.length === items.length) return false
        await saveAllItems(filtered)
        return true
    },

    async getById(id: string): Promise<KnowledgeItem | null> {
        const items = await getAllItems()
        return items.find((item) => item.id === id) ?? null
    },

    async list(query: KnowledgeQuery = {}): Promise<KnowledgeItem[]> {
        let items = await getAllItems()

        if (query.keyword) {
            const kw = query.keyword.toLowerCase()
            items = items.filter(
                (item) =>
                    item.title.toLowerCase().includes(kw) ||
                    item.summary?.toLowerCase().includes(kw) ||
                    item.url.toLowerCase().includes(kw) ||
                    item.tags.some((tag) => tag.toLowerCase().includes(kw)) ||
                    item.category.toLowerCase().includes(kw)
            )
        }

        if (query.category) {
            items = items.filter((item) => item.category === query.category)
        }

        if (query.tags?.length) {
            items = items.filter((item) =>
                query.tags!.every((tag) => item.tags.includes(tag))
            )
        }

        if (query.sourceType) {
            items = items.filter((item) => item.sourceType === query.sourceType)
        }

        if (query.favorite !== undefined) {
            items = items.filter((item) => Boolean(item.favorite) === query.favorite)
        }

        if (query.archived !== undefined) {
            items = items.filter((item) => Boolean(item.archived) === query.archived)
        } else {
            items = items.filter((item) => !item.archived)
        }

        const orderBy = query.orderBy ?? "createdAt"
        const orderDir = query.orderDir ?? "desc"
        items.sort((a, b) => {
            const diff = a[orderBy] - b[orderBy]
            return orderDir === "desc" ? -diff : diff
        })

        if (query.offset) {
            items = items.slice(query.offset)
        }

        if (query.limit) {
            items = items.slice(0, query.limit)
        }

        return items
    },

    async search(keyword: string): Promise<KnowledgeItem[]> {
        return this.list({ keyword })
    },

    async getTodayCount(): Promise<number> {
        const items = await getAllItems()
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        return items.filter((item) => item.createdAt >= todayStart.getTime()).length
    }
}
