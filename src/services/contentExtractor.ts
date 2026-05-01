export interface ExtractedPageContent {
    title: string
    url: string
    text: string
    html?: string
    excerpt?: string
    siteName?: string
}

const NOISE_SELECTORS = [
    "script",
    "style",
    "noscript",
    "svg",
    "canvas",
    "iframe",
    "nav",
    "aside",
    "footer",
    "header nav",
    "[role='navigation']",
    "[role='complementary']",
    ".advertisement",
    ".ads",
    ".ad",
    ".sidebar",
    ".toc",
    ".comments",
    ".comment",
    ".related",
    ".breadcrumb",
    ".pagination"
].join(", ")

const ARTICLE_CONTENT_SELECTORS = [
    "article",
    "main",
    ".content",
    ".post-content",
    ".article-content",
    ".markdown-body",
    ".entry-content",
    "#content",
    "#main",
    ".post-body",
    ".article-body"
]

function readMeta(selector: string, attr = "content"): string {
    return document.querySelector(selector)?.getAttribute(attr)?.trim() ?? ""
}

function sanitize(root: Element): Element {
    const clone = root.cloneNode(true) as Element
    clone.querySelectorAll(NOISE_SELECTORS).forEach((node) => node.remove())
    return clone
}

function normalizeText(text: string): string {
    return text
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]{2,}/g, " ")
        .trim()
}

function textDensity(element: Element): number {
    const textLength = normalizeText(element.textContent ?? "").length
    const htmlLength = element.innerHTML.length || 1
    return textLength / htmlLength
}

function scoreCandidate(element: Element): number {
    const cleaned = sanitize(element)
    const text = normalizeText(cleaned.textContent ?? "")
    const pCount = cleaned.querySelectorAll("p").length
    const density = textDensity(element)
    let score = text.length + pCount * 40
    if (density > 0.4) score += 200
    return score
}

function extractMainText(): string {
    // Try known article selectors first
    for (const selector of ARTICLE_CONTENT_SELECTORS) {
        const el = document.querySelector(selector)
        if (el) {
            const cleaned = sanitize(el)
            const text = normalizeText(cleaned.textContent ?? "")
            if (text.length > 200) return text
        }
    }

    // Score all block candidates
    const candidates = Array.from(
        document.body.querySelectorAll("div, section, article, main")
    )

    if (candidates.length > 0) {
        const best = candidates
            .map((el) => ({ el, score: scoreCandidate(el) }))
            .sort((a, b) => b.score - a.score)[0]

        if (best && best.score > 300) {
            const cleaned = sanitize(best.el)
            const text = normalizeText(cleaned.textContent ?? "")
            if (text.length > 100) return text
        }
    }

    // Fallback: body
    const body = sanitize(document.body)
    return normalizeText(body.textContent ?? "")
}

export const contentExtractor = {
    extract(): ExtractedPageContent {
        const title =
            document.title ||
            readMeta('meta[property="og:title"]') ||
            readMeta('meta[name="twitter:title"]') ||
            ""

        const url = location.href

        const siteName =
            readMeta('meta[property="og:site_name"]') ||
            readMeta('meta[name="application-name"]') ||
            location.hostname ||
            ""

        const excerpt =
            readMeta('meta[name="description"]') ||
            readMeta('meta[property="og:description"]') ||
            readMeta('meta[name="twitter:description"]') ||
            ""

        const text = extractMainText()

        return { title, url, text, excerpt, siteName }
    }
}
