const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "with",
  "一个",
  "一些",
  "以及",
  "使用",
  "关于",
  "可以",
  "页面",
  "工具",
  "内容",
  "支持",
  "进行",
  "需要"
])

export function normalizeText(input: string) {
  return input
    .toLowerCase()
    .replace(/https?:\/\//g, " ")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ")
    .trim()
}

export function tokenize(input: string) {
  return normalizeText(input)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOPWORDS.has(token))
}

export function unique<T>(items: T[]) {
  return Array.from(new Set(items))
}

export function topKeywords(input: string, limit = 3) {
  const frequency = new Map<string, number>()

  for (const token of tokenize(input)) {
    frequency.set(token, (frequency.get(token) ?? 0) + 1)
  }

  return [...frequency.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([token]) => token)
}

export function titleCase(input: string) {
  if (/[\u4e00-\u9fa5]/.test(input)) {
    return input
  }

  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ")
}
