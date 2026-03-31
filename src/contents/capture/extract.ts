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
        readMeta('meta[name="publish-date"]')

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
