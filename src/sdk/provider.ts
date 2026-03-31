import { generateText } from "@xsai/generate-text"

import type {
  FolderIndex,
  FolderSuggestion,
  RecommendationInput,
  RecommendationResult,
  SmartFavoritesSettings
} from "~/src/sdk/types"

function renderTemplate(
  template: string,
  input: RecommendationInput,
  folderIndex: FolderIndex
) {
  const folders = folderIndex.folders
    .slice(0, 120)
    .map(
      (folder) =>
        `- ${folder.path} | id=${folder.id} | bookmarks=${folder.bookmarkCount}`
    )
    .join("\n")

  return template
    .replaceAll("{{title}}", input.page.title || "")
    .replaceAll("{{url}}", input.page.url || "")
    .replaceAll("{{domain}}", input.page.domain || "")
    .replaceAll("{{description}}", input.page.description || "")
    .replaceAll("{{summary}}", input.page.summary || "")
    .replaceAll("{{selectedText}}", input.selectedText || "")
    .replaceAll("{{tags}}", input.tags.join(", "))
    .replaceAll("{{notes}}", input.notes || "")
    .replaceAll("{{folders}}", folders)
}

const suggestionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["suggestions"],
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type"],
        properties: {
          type: {
            type: "string",
            enum: ["existing", "create"]
          },
          folderId: {
            type: "string"
          },
          title: {
            type: "string"
          },
          reason: {
            type: "string"
          }
        }
      }
    }
  }
} as const

function parseJsonResponse(content: string) {
  const match = content.match(/\{[\s\S]*\}/)
  if (!match) {
    throw new Error("AI 响应中没有合法 JSON。")
  }

  return JSON.parse(match[0]) as {
    suggestions?: Array<{
      type?: "existing" | "create"
      folderId?: string
      title?: string
      reason?: string
    }>
  }
}

export async function extractAiRecommendations(
  input: RecommendationInput,
  folderIndex: FolderIndex,
  settings: SmartFavoritesSettings,
  fallback: RecommendationResult
): Promise<RecommendationResult> {
  const result = await generateText({
    apiKey: settings.provider.apiKey,
    baseURL: settings.provider.baseUrl,
    model: settings.provider.model,
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "bookmark_folder_suggestions",
        strict: true,
        schema: suggestionSchema
      }
    },
    messages: [
      {
        role: "system",
        content: settings.prompts.system
      },
      {
        role: "user",
        content: renderTemplate(settings.prompts.template, input, folderIndex)
      }
    ]
  })
  const parsed = parseJsonResponse(result.text || "")

  const suggestions: FolderSuggestion[] = []

  for (const [index, item] of (parsed.suggestions ?? []).entries()) {
    const existingFolder = folderIndex.folders.find(
      (folder) => folder.id === item.folderId
    )

    if (item.type === "existing" && existingFolder) {
      suggestions.push({
        key: `existing:${existingFolder.id}:${index}`,
        type: "existing",
        folderId: existingFolder.id,
        title: existingFolder.title,
        path: existingFolder.path,
        score: 100 - index,
        reason: item.reason || "AI 推荐复用现有结构。"
      })
      continue
    }

    if (item.type === "create" && item.title) {
      suggestions.push({
        key: `create:${item.title}:${index}`,
        type: "create",
        title: item.title,
        path: `新建 / ${item.title}`,
        score: 60 - index,
        reason: item.reason || "AI 认为当前结构不够匹配，建议新建。"
      })
    }
  }

  return {
    source: suggestions.length > 0 ? "ai" : fallback.source,
    suggestions: suggestions.length > 0 ? suggestions : fallback.suggestions
  }
}
