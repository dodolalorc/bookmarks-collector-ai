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

export interface BookmarkMutationResult {
    folderPath: string
    bookmark: chrome.bookmarks.BookmarkTreeNode
    message: string
}

export interface SnippetCollectionFolder {
    id: string
    name: string
    description?: string
    isDefault?: boolean
    createdAt: string
    updatedAt: string
}

export interface SnippetCollectionItem {
    id: string
    folderId: string
    sourceUrl: string
    snippetId?: string
    title: string
    text: string
    originalText: string
    mode: "selection" | "element"
    selector?: string
    analysisSummary?: string
    analysisTags?: string[]
    createdAt: string
    updatedAt: string
}

export interface SnippetCollectionState {
    folders: SnippetCollectionFolder[]
    items: SnippetCollectionItem[]
}
