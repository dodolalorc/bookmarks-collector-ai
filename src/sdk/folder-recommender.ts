import type {
  BookmarkFolder,
  FolderIndex,
  FolderSuggestion,
  RecommendationInput,
  RecommendationResult,
  SmartFavoritesSettings
} from "~/src/sdk/types"
import { titleCase, tokenize, topKeywords, unique } from "~/src/sdk/text"

function scoreFolder(folder: BookmarkFolder, tokens: string[], domain: string) {
  let score = 0
  const folderTokens = tokenize(`${folder.title} ${folder.path}`)
  const sampleTokens = tokenize(folder.sampleTitles.join(" "))

  for (const token of tokens) {
    if (folderTokens.includes(token)) {
      score += 10
    }

    if (sampleTokens.includes(token)) {
      score += 6
    }

    if (domain && folder.path.toLowerCase().includes(domain.toLowerCase())) {
      score += 4
    }
  }

  if (folder.bookmarkCount > 0 && folder.bookmarkCount < 30) {
    score += 2
  }

  return score
}

function buildCreateSuggestion(
  input: RecommendationInput,
  settings: SmartFavoritesSettings
) {
  if (!settings.behavior.allowCreateFolder) {
    return null
  }

  const keywords = topKeywords(
    [input.page.title, input.page.domain, input.notes, input.tags.join(" ")]
      .filter(Boolean)
      .join(" "),
    2
  )

  const title = titleCase(
    unique([
      input.tags[0],
      keywords.join(" "),
      input.page.domain.replace(/^www\./, "")
    ]).find(Boolean) || "待整理"
  )

  return {
    key: `create:${title}`,
    type: "create" as const,
    title,
    path: `新建 / ${title}`,
    score: 1,
    reason: "当前结构没有明显匹配项，建议先新建一个可确认的临时分类。"
  }
}

export function recommendFolders(
  input: RecommendationInput,
  folderIndex: FolderIndex,
  settings: SmartFavoritesSettings
): RecommendationResult {
  const tokens = unique(
    tokenize(
      [
        input.page.title,
        input.page.url,
        input.page.summary,
        input.selectedText,
        input.notes,
        input.tags.join(" ")
      ]
        .filter(Boolean)
        .join(" ")
    )
  )

  const ranked = folderIndex.folders
    .map((folder) => ({
      folder,
      score: scoreFolder(folder, tokens, input.page.domain)
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map<FolderSuggestion>((item) => ({
      key: `existing:${item.folder.id}`,
      type: "existing",
      folderId: item.folder.id,
      title: item.folder.title,
      path: item.folder.path,
      score: item.score,
      reason:
        item.folder.sampleTitles.length > 0
          ? `标题和已有书签样本有重叠，适合归入当前结构。示例：${item.folder.sampleTitles[0]}`
          : "当前页面关键词与该文件夹命名相近。"
    }))

  const createSuggestion = buildCreateSuggestion(input, settings)
  const suggestions =
    ranked.length === 0
      ? createSuggestion
        ? [createSuggestion]
        : []
      : settings.behavior.preferExistingFolder
        ? createSuggestion
          ? [...ranked, createSuggestion]
          : ranked
        : createSuggestion
          ? [ranked[0], createSuggestion, ...ranked.slice(1)].filter(Boolean)
          : ranked

  return {
    source: "heuristic",
    suggestions
  }
}
