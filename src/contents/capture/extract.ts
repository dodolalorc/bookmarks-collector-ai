import type { CapturedSnippet, PageContext } from "../../sdk/types"

const readMeta = (selector: string, attr = "content") =>
    document.querySelector(selector)?.getAttribute(attr)?.trim() ?? ""

export const getCurrentSelectionText = () =>
  window.getSelection?.()?.toString().trim() ?? ""

export const createSnippet = (
    mode: "selection" | "element",
    text: string,
    label: string,
    selector?: string
): CapturedSnippet => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  mode,
  text,
  label,
  selector,
  createdAt: new Date().toISOString()
})

export const getPageContext = (): PageContext => {
    const title = document.title?.trim() || location.hostname
    const description = readMeta('meta[name="description"]')
    const author =
    readMeta('meta[name="author"]') ||
    readMeta('meta[property="article:author"]') ||
    (document.querySelector('[itemprop="author"]')?.textContent?.trim() ?? "")
  const siteName = readMeta('meta[property="og:site_name"]')
  const publishedAt =
    readMeta('meta[property="article:published_time"]') ||
    readMeta('meta[name="publish-date"]') ||
    readMeta('meta[name="date"]') ||
    (document.querySelector("time")?.getAttribute("datetime")?.trim() ?? "")

  const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
    .map((element) => element.textContent?.trim() ?? "")
    .filter(Boolean)
    .slice(0, 8)

  const paragraphs = Array.from(document.querySelectorAll("p, article p, main p"))
    .map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "")
    .filter((text) => text.length > 40)
    .slice(0, 6)

  return {
    title,
    url: location.href,
    domain: location.hostname,
    description,
    author,
    siteName,
    publishedAt,
    summary: [description, ...headings, ...paragraphs]
      .filter(Boolean)
      .join("\n")
      .slice(0, 2200)
  }
}

const normalizeText = (text: string) =>
  text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()

const readTextBlocks = (root: ParentNode, selector: string) =>
  Array.from(root.querySelectorAll(selector))
    .map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "")
    .filter((text) => text.length > 0)

const scoreArticleCandidate = (element: Element) => {
  const text = normalizeText(element.textContent ?? "")
  const paragraphs = readTextBlocks(element, "p")
  const headings = readTextBlocks(element, "h1, h2, h3, h4")

  return text.length + paragraphs.length * 180 + headings.length * 80
}

const pickArticleRoot = () => {
  const candidates = Array.from(
    document.querySelectorAll(
      "article, main article, main, [role='main'], .post, .article, .entry-content, .markdown-body"
    )
  )

  const scored = candidates
    .map((element) => ({
      element,
      score: scoreArticleCandidate(element)
    }))
    .sort((left, right) => right.score - left.score)

  return scored[0]?.element ?? document.body
}

export const getPageArticleText = () => {
  const articleRoot = pickArticleRoot()
  const title = document.title?.trim() || location.hostname
  const blocks: string[] = []

  const headings = readTextBlocks(articleRoot, "h1, h2, h3")
  if (headings.length > 0) {
    blocks.push(...headings.map((heading, index) => `${"#".repeat(Math.min(index + 1, 3))} ${heading}`))
  }

  const paragraphs = readTextBlocks(
    articleRoot,
    "p, li, blockquote, pre code, figcaption"
  ).filter((text) => text.length >= 16)

  if (paragraphs.length > 0) {
    blocks.push(...paragraphs)
  }

  const content = normalizeText(
    [title, ...blocks].filter(Boolean).join("\n\n")
  ).slice(0, 32000)

  return content
}

export const cssPathFor = (element: Element) => {
    const segments: string[] = []
    let current: Element | null = element

    while (current && segments.length < 5) {
        const tag = current.tagName.toLowerCase()
        if (current.id) {
            segments.unshift(`${tag}#${current.id}`)
            break
        }

        const siblings = current.parentElement
            ? Array.from(current.parentElement.children).filter(
                (item) => item.tagName === current.tagName
            )
            : []
        const index =
            siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(current) + 1})` : ""
        segments.unshift(`${tag}${index}`)
        current = current.parentElement
    }

    return segments.join(" > ")
}
