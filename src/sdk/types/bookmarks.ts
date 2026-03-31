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
