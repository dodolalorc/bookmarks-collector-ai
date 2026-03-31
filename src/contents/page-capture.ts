import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useMemo, useState } from "react"

import type {
  CapturedSnippet,
  CapturePageResponse,
  PageCaptureDraft,
  PageContext
} from "~/src/sdk/types"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

const ROOT_ID = "smart-favorites-overlay-root"
const HIGHLIGHT_ID = "smart-favorites-highlight-box"

function createSnippet(
  mode: "selection" | "element",
  text: string,
  label: string,
  selector?: string
): CapturedSnippet {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    mode,
    text,
    label,
    selector,
    createdAt: new Date().toISOString()
  }
}

function getPageContext(): PageContext {
  const title = document.title?.trim() || location.hostname
  const description =
    document
      .querySelector('meta[name="description"]')
      ?.getAttribute("content")
      ?.trim() ?? ""

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
    summary: [description, ...headings, ...paragraphs]
      .filter(Boolean)
      .join("\n")
      .slice(0, 2200)
  }
}

function cssPathFor(element: Element) {
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

async function fetchDraft(url: string): Promise<PageCaptureDraft> {
  const response = await chrome.runtime.sendMessage({
    type: "smart-favorites/get-capture-draft",
    payload: url
  })

  if (!response?.ok) {
    throw new Error(response?.error || "无法读取抓取草稿")
  }

  return response.payload as PageCaptureDraft
}

async function storeSnippet(url: string, snippet: CapturedSnippet) {
  const response = await chrome.runtime.sendMessage({
    type: "smart-favorites/add-captured-snippet",
    payload: { url, snippet }
  })

  if (!response?.ok) {
    throw new Error(response?.error || "无法保存抓取内容")
  }

  return response.payload as PageCaptureDraft
}

async function removeSnippet(url: string, snippetId: string) {
  const response = await chrome.runtime.sendMessage({
    type: "smart-favorites/remove-captured-snippet",
    payload: { url, snippetId }
  })

  if (!response?.ok) {
    throw new Error(response?.error || "无法删除抓取内容")
  }

  return response.payload as PageCaptureDraft
}

async function openExtensionPage(path: string) {
  await chrome.runtime.sendMessage({
    type: "smart-favorites/open-extension-page",
    payload: { path }
  })
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "smart-favorites/capture-page") {
    return
  }

  void fetchDraft(location.href)
    .then((draft) =>
      sendResponse({
        page: getPageContext(),
        selectionText: window.getSelection?.()?.toString().trim() ?? "",
        snippets: draft.snippets,
        extractedAt: new Date().toISOString()
      } satisfies CapturePageResponse)
    )
    .catch(() =>
      sendResponse({
        page: getPageContext(),
        selectionText: window.getSelection?.()?.toString().trim() ?? "",
        snippets: [],
        extractedAt: new Date().toISOString()
      } satisfies CapturePageResponse)
    )

  return true
})

const buttonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer"
}

function ContentOverlay() {
  const [draft, setDraft] = useState<PageCaptureDraft>({
    url: location.href,
    snippets: [],
    updatedAt: new Date().toISOString()
  })
  const [isExpanded, setIsExpanded] = useState(false)
  const [isElementPickMode, setIsElementPickMode] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [status, setStatus] = useState("等待抓取")

  const selectionText = useMemo(
    () => window.getSelection?.()?.toString().trim() ?? "",
    [draft.updatedAt]
  )

  useEffect(() => {
    void fetchDraft(location.href).then(setDraft).catch(() => undefined)
  }, [])

  useEffect(() => {
    const highlight = ensureHighlightBox()

    function onMouseMove(event: MouseEvent) {
      if (!isElementPickMode) {
        highlight.style.display = "none"
        return
      }

      const target = event.target
      if (!(target instanceof Element) || target.closest(`#${ROOT_ID}`)) {
        highlight.style.display = "none"
        return
      }

      const rect = target.getBoundingClientRect()
      highlight.style.display = "block"
      highlight.style.left = `${rect.left + window.scrollX}px`
      highlight.style.top = `${rect.top + window.scrollY}px`
      highlight.style.width = `${rect.width}px`
      highlight.style.height = `${rect.height}px`
    }

    async function onClick(event: MouseEvent) {
      if (!isElementPickMode) {
        return
      }

      const target = event.target
      if (!(target instanceof Element) || target.closest(`#${ROOT_ID}`)) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      const text = target.textContent?.replace(/\s+/g, " ").trim() ?? ""
      if (text.length < 8) {
        setStatus("这个元素内容太短，换一个块级区域。")
        return
      }

      const selector = cssPathFor(target)
      const label = target.tagName.toLowerCase()
      const nextDraft = await storeSnippet(
        location.href,
        createSnippet("element", text.slice(0, 2000), label, selector)
      )

      setDraft(nextDraft)
      setStatus(`已加入元素内容：${label}`)
      setIsExpanded(true)
      setIsElementPickMode(false)
      highlight.style.display = "none"
    }

    document.addEventListener("mousemove", onMouseMove, true)
    document.addEventListener("click", onClick, true)

    return () => {
      document.removeEventListener("mousemove", onMouseMove, true)
      document.removeEventListener("click", onClick, true)
      highlight.style.display = "none"
    }
  }, [isElementPickMode])

  async function captureSelection() {
    const text = window.getSelection?.()?.toString().trim() ?? ""
    if (text.length < 2) {
      setStatus("先在页面中选中一段文字。")
      return
    }

    const nextDraft = await storeSnippet(
      location.href,
      createSnippet("selection", text.slice(0, 2000), "selection")
    )

    setDraft(nextDraft)
    setStatus("已把选中文本加入内容面板。")
    setIsExpanded(true)
  }

  async function deleteSnippet(snippetId: string) {
    const nextDraft = await removeSnippet(location.href, snippetId)
    setDraft(nextDraft)
  }

  return (
    <div
      id={ROOT_ID}
      style={{
        position: "fixed",
        right: 20,
        top: 88,
        zIndex: 2147483646,
        fontFamily:
          '"SF Pro Text", "Segoe UI", "PingFang SC", "Hiragino Sans GB", sans-serif'
      }}>
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 10
        }}>
        {menuOpen ? (
          <div
            style={{
              width: 196,
              borderRadius: 18,
              padding: 12,
              background: "rgba(23, 32, 51, 0.96)",
              color: "#ffffff",
              boxShadow: "0 20px 40px rgba(23, 32, 51, 0.28)"
            }}>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 10 }}>
              常用操作
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => {
                  void captureSelection()
                  setMenuOpen(false)
                }}
                style={{
                  ...buttonStyle,
                  background: "#ffb84d",
                  color: "#172033"
                }}
                type="button">
                抓取当前选中文本
              </button>
              <button
                onClick={() => {
                  setIsElementPickMode((value) => !value)
                  setMenuOpen(false)
                }}
                style={{
                  ...buttonStyle,
                  background: isElementPickMode ? "#ffd5a0" : "#ffffff",
                  color: "#172033"
                }}
                type="button">
                {isElementPickMode ? "退出元素框选" : "开启元素框选"}
              </button>
              <button
                onClick={() => void openExtensionPage("options.html")}
                style={{
                  ...buttonStyle,
                  background: "#eff3ff",
                  color: "#172033"
                }}
                type="button">
                打开模型配置
              </button>
              <button
                onClick={() => void openExtensionPage("options.html#history")}
                style={{
                  ...buttonStyle,
                  background: "#eef8f4",
                  color: "#172033"
                }}
                type="button">
                查看书签整理
              </button>
            </div>
          </div>
        ) : null}

        {isExpanded ? (
          <div
            style={{
              width: 360,
              maxHeight: "70vh",
              overflow: "auto",
              borderRadius: 24,
              padding: 16,
              background: "rgba(255, 255, 255, 0.97)",
              color: "#172033",
              border: "1px solid rgba(23, 32, 51, 0.1)",
              boxShadow: "0 24px 48px rgba(23, 32, 51, 0.18)"
            }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12
              }}>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "#b26a00",
                    fontWeight: 800
                  }}>
                  Smart Favorites
                </div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>内容抓取面板</div>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                style={{
                  ...buttonStyle,
                  background: "#172033",
                  color: "#ffffff",
                  padding: "8px 10px"
                }}
                type="button">
                收起
              </button>
            </div>

            <div
              style={{
                fontSize: 12,
                color: "#627089",
                marginBottom: 10,
                lineHeight: 1.6
              }}>
              {status}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => void captureSelection()}
                style={{
                  ...buttonStyle,
                  background: "#ffb84d",
                  color: "#172033"
                }}
                type="button">
                添加当前选中
              </button>
              <button
                onClick={() => setIsElementPickMode((value) => !value)}
                style={{
                  ...buttonStyle,
                  background: isElementPickMode ? "#ffd9ad" : "#eef3ff",
                  color: "#172033"
                }}
                type="button">
                {isElementPickMode ? "退出框选模式" : "元素框选模式"}
              </button>
              <button
                onClick={() => void openExtensionPage("options.html#history")}
                style={{
                  ...buttonStyle,
                  background: "#eef8f4",
                  color: "#172033"
                }}
                type="button">
                打开书签整理页
              </button>
            </div>

            {selectionText ? (
              <div
                style={{
                  background: "#fff6df",
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 12,
                  fontSize: 12,
                  lineHeight: 1.6
                }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>当前选中文本</div>
                <div>{selectionText.slice(0, 280)}</div>
              </div>
            ) : null}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {draft.snippets.length === 0 ? (
                <div
                  style={{
                    borderRadius: 14,
                    background: "#f6f8fb",
                    padding: 14,
                    color: "#627089",
                    fontSize: 12,
                    lineHeight: 1.6
                  }}>
                    还没有内容。你可以直接选中文字后加入，也可以开启元素框选模式点选页面区域。
                  </div>
                ) : null}

              {draft.snippets.map((snippet) => (
                <div
                  key={snippet.id}
                  style={{
                    border: "1px solid rgba(23, 32, 51, 0.08)",
                    borderRadius: 14,
                    padding: 12,
                    background: "#ffffff"
                  }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      marginBottom: 6
                    }}>
                    <div style={{ fontSize: 12, fontWeight: 800 }}>
                      {snippet.mode === "selection" ? "文本抓取" : "元素框选"}
                    </div>
                    <button
                      onClick={() => void deleteSnippet(snippet.id)}
                      style={{
                        ...buttonStyle,
                        padding: "6px 8px",
                        background: "#f4f6f8",
                        color: "#172033"
                      }}
                      type="button">
                      删除
                    </button>
                  </div>
                  {snippet.selector ? (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#627089",
                        marginBottom: 6,
                        wordBreak: "break-all"
                      }}>
                      {snippet.selector}
                    </div>
                  ) : null}
                  <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                    {snippet.text.slice(0, 420)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setMenuOpen((value) => !value)}
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              border: 0,
              background:
                "linear-gradient(135deg, #172033 0%, #2f4a73 55%, #ffb84d 100%)",
              color: "#ffffff",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 18px 30px rgba(23, 32, 51, 0.28)"
            }}
            type="button">
            AI
          </button>
          <button
            onClick={() => setIsExpanded((value) => !value)}
            style={{
              padding: "0 18px",
              height: 54,
              borderRadius: 18,
              border: 0,
              background: "rgba(255,255,255,0.96)",
              color: "#172033",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 18px 30px rgba(23, 32, 51, 0.18)"
            }}
            type="button">
            {isExpanded ? "收起抓取面板" : "展开抓取面板"}
          </button>
        </div>
      </div>
    </div>
  )
}

function ensureHighlightBox() {
  let box = document.getElementById(HIGHLIGHT_ID)
  if (!box) {
    box = document.createElement("div")
    box.id = HIGHLIGHT_ID
    Object.assign(box.style, {
      position: "absolute",
      pointerEvents: "none",
      border: "2px solid #ff9b00",
      background: "rgba(255, 184, 77, 0.16)",
      zIndex: "2147483645",
      display: "none",
      borderRadius: "8px"
    })
    document.documentElement.appendChild(box)
  }

  return box
}

export default ContentOverlay
