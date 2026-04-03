import { generateText } from "@xsai/generate-text"

import type {
  AiModelProfile,
  FolderIndex,
  FolderSuggestion,
  PageContext,
  PageDigestRequest,
  PageDigestResult,
  RecommendationInput,
  RecommendationResult,
  SmartFavoritesSettings
} from "~/src/sdk/types"

type SnippetAnalysisResult = {
  summary: string
  tags: string[]
}

const estimateTokens = (text: string) => Math.max(1, Math.ceil(text.length / 4))

function resolveProvider(
  settings: SmartFavoritesSettings,
  providerId?: string
): AiModelProfile {
  const candidates = settings.providers?.length
    ? settings.providers
    : [
        {
          id: settings.activeProviderId || "default-provider",
          label: settings.provider.model || "默认模型",
          ...settings.provider
        }
      ]

  return (
    candidates.find((provider) => provider.id === providerId) ??
    candidates.find((provider) => provider.id === settings.activeProviderId) ??
    candidates[0]
  )
}

function hasProviderConfig(provider: Pick<AiModelProfile, "apiKey" | "baseUrl" | "model">) {
  return Boolean(provider.apiKey && provider.baseUrl && provider.model)
}

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

const heuristicSnippetAnalysis = (text: string): SnippetAnalysisResult => {
  const normalized = text.replace(/\s+/g, " ").trim()
  const sentenceMatch = normalized.match(/[^。！？!?\.]+[。！？!?\.]?/g) ?? []
  const summary = sentenceMatch.slice(0, 3).join(" ").slice(0, 220)

  const rawTokens = normalized
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3)

  const stopWords = new Set([
    "this",
    "that",
    "with",
    "from",
    "have",
    "will",
    "about",
    "your",
    "their",
    "would",
    "could",
    "should",
    "https",
    "http",
    "www",
    "com"
  ])

  const scores = new Map<string, number>()
  rawTokens.forEach((token) => {
    if (stopWords.has(token)) {
      return
    }
    scores.set(token, (scores.get(token) ?? 0) + 1)
  })

  const tags = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([token]) => token)

  return {
    summary: summary || normalized.slice(0, 180),
    tags
  }
}

export const analyzeSnippetContent = async (
  text: string,
  settings: SmartFavoritesSettings
): Promise<SnippetAnalysisResult> => {
  const provider = resolveProvider(settings)

  if (!hasProviderConfig(provider)) {
    return heuristicSnippetAnalysis(text)
  }

  try {
    const result = await generateText({
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl,
      model: provider.model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "你是网页内容分析助手。请输出 JSON：{summary: string, tags: string[]}，summary 用 2-3 句中文，tags 给 3-5 个关键词。"
        },
        {
          role: "user",
          content: `请分析这段文本：\n${text.slice(0, 2200)}`
        }
      ]
    })

    const parsed = parseJsonResponse(result.text || "") as {
      summary?: string
      tags?: string[]
    }

    const summary = parsed.summary?.trim()
    const tags = (parsed.tags ?? []).filter(Boolean).slice(0, 5)

    if (summary) {
      return {
        summary,
        tags
      }
    }
  } catch {
    return heuristicSnippetAnalysis(text)
  }

  return heuristicSnippetAnalysis(text)
}

export async function extractAiRecommendations(
  input: RecommendationInput,
  folderIndex: FolderIndex,
  settings: SmartFavoritesSettings,
  fallback: RecommendationResult
): Promise<RecommendationResult> {
  const provider = resolveProvider(settings)

  const result = await generateText({
    apiKey: provider.apiKey,
    baseURL: provider.baseUrl,
    model: provider.model,
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

function buildDigestPrompt(page: PageContext, content: string, prompt?: string) {
  return [
    "请把这个网页当作博客文章来处理，抽取成便于后续给 AI 使用的中文材料。",
    "输出要求：",
    "1. 先给出基础信息，尽量覆盖标题、作者、日期、网址、站点、描述。",
    "2. 然后给出“文章关键信息抓取”，覆盖全文关键论点、结构、结论、重要事实和示例。",
    "3. 不要写与原文无关的推测；没有的信息直接写“未识别”。",
    "4. 输出纯文本，层次清晰，适合继续喂给模型。",
    prompt?.trim() ? `5. 额外用户要求：${prompt.trim()}` : ""
  ]
    .filter(Boolean)
    .join("\n")
    .concat(
      `\n\n页面元信息：\n标题：${page.title || "未识别"}\n作者：${page.author || "未识别"}\n日期：${page.publishedAt || "未识别"}\n网址：${page.url || "未识别"}\n站点：${page.siteName || page.domain || "未识别"}\n描述：${page.description || "未识别"}\n\n页面内容：\n${content.slice(0, 24000)}`
    )
}

function buildHeuristicDigest(payload: PageDigestRequest): string {
  const page = payload.page
  const normalizedContent = payload.content
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 12000)

  const sections = [
    "基础信息",
    `- 标题：${page.title || "未识别"}`,
    `- 作者：${page.author || "未识别"}`,
    `- 日期：${page.publishedAt || "未识别"}`,
    `- 网址：${page.url || "未识别"}`,
    `- 站点：${page.siteName || page.domain || "未识别"}`,
    `- 描述：${page.description || "未识别"}`,
    "",
    "文章关键信息抓取",
    normalizedContent || page.summary || "未抓取到足够正文。"
  ]

  if (payload.prompt?.trim()) {
    sections.push("", "用户补充提示", payload.prompt.trim())
  }

  return sections.join("\n")
}

export async function summarizePageContent(
  payload: PageDigestRequest,
  settings: SmartFavoritesSettings
): Promise<PageDigestResult> {
  const provider = resolveProvider(settings, payload.providerId)
  const fallback = buildHeuristicDigest(payload)

  if (!hasProviderConfig(provider)) {
    return {
      modelLabel: provider.label || "未配置模型",
      providerId: provider.id,
      content: fallback,
      tokenEstimate: estimateTokens(fallback)
    }
  }

  try {
    const result = await generateText({
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl,
      model: provider.model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "你是网页内容整理助手。请将页面整理成 AI 易读、信息密度高、结构清晰的中文纯文本。"
        },
        {
          role: "user",
          content: buildDigestPrompt(payload.page, payload.content, payload.prompt)
        }
      ]
    })

    const content = result.text?.trim() || fallback
    return {
      modelLabel: provider.label || provider.model,
      providerId: provider.id,
      content,
      tokenEstimate: estimateTokens(content)
    }
  } catch {
    return {
      modelLabel: provider.label || provider.model,
      providerId: provider.id,
      content: fallback,
      tokenEstimate: estimateTokens(fallback)
    }
  }
}

export { estimateTokens, resolveProvider, hasProviderConfig }
