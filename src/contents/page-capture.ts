import type { PlasmoCSConfig } from "plasmo"

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

type OverlayState = {
  draft: PageCaptureDraft
  expanded: boolean
  menuOpen: boolean
  elementPickMode: boolean
  status: string
}

const state: OverlayState = {
  draft: {
    url: location.href,
    snippets: [],
    updatedAt: new Date().toISOString()
  },
  expanded: false,
  menuOpen: false,
  elementPickMode: false,
  status: "等待抓取"
}

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

async function sendMessage<T>(type: string, payload?: unknown) {
  const response = await chrome.runtime.sendMessage({
    type,
    payload
  })

  if (!response?.ok) {
    throw new Error(response?.error || "内容脚本消息失败")
  }

  return response.payload as T
}

async function fetchDraft() {
  state.draft = await sendMessage<PageCaptureDraft>(
    "smart-favorites/get-capture-draft",
    location.href
  )
  renderOverlay()
}

async function storeSnippet(snippet: CapturedSnippet) {
  state.draft = await sendMessage<PageCaptureDraft>(
    "smart-favorites/add-captured-snippet",
    {
      url: location.href,
      snippet
    }
  )
  renderOverlay()
}

async function removeSnippet(snippetId: string) {
  state.draft = await sendMessage<PageCaptureDraft>(
    "smart-favorites/remove-captured-snippet",
    {
      url: location.href,
      snippetId
    }
  )
  renderOverlay()
}

async function openExtensionPage(path: string) {
  await sendMessage<{ success: boolean }>("smart-favorites/open-extension-page", {
    path
  })
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

function currentSelectionText() {
  return window.getSelection?.()?.toString().trim() ?? ""
}

function rootElement() {
  let root = document.getElementById(ROOT_ID)

  if (!root) {
    root = document.createElement("div")
    root.id = ROOT_ID
    document.documentElement.appendChild(root)
  }

  return root
}

function snippetMarkup(snippet: CapturedSnippet) {
  const selector = snippet.selector
    ? `<div style="font-size:11px;color:#627089;margin-bottom:6px;word-break:break-all;">${escapeHtml(snippet.selector)}</div>`
    : ""

  return `
    <div data-snippet-id="${snippet.id}" style="border:1px solid rgba(23,32,51,0.08);border-radius:14px;padding:12px;background:#fff;">
      <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:6px;">
        <div style="font-size:12px;font-weight:800;">${snippet.mode === "selection" ? "文本抓取" : "元素框选"}</div>
        <button data-action="delete-snippet" data-snippet-id="${snippet.id}" style="border:0;border-radius:10px;padding:6px 8px;background:#f4f6f8;color:#172033;font-size:12px;font-weight:700;cursor:pointer;">删除</button>
      </div>
      ${selector}
      <div style="font-size:12px;line-height:1.6;">${escapeHtml(snippet.text.slice(0, 420))}</div>
    </div>
  `
}

function renderOverlay() {
  const root = rootElement()
  const selection = currentSelectionText()
  const snippets =
    state.draft.snippets.length === 0
      ? `
        <div style="border-radius:14px;background:#f6f8fb;padding:14px;color:#627089;font-size:12px;line-height:1.6;">
          还没有内容。你可以直接选中文字后加入，也可以开启元素框选模式点选页面区域。
        </div>
      `
      : state.draft.snippets.map(snippetMarkup).join("")

  root.innerHTML = `
    <div style="position:fixed;right:20px;top:88px;z-index:2147483646;font-family:'SF Pro Text','Segoe UI','PingFang SC','Hiragino Sans GB',sans-serif;">
      <div style="position:relative;display:flex;flex-direction:column;align-items:flex-end;gap:10px;">
        ${
          state.menuOpen
            ? `
          <div style="width:196px;border-radius:18px;padding:12px;background:rgba(23,32,51,0.96);color:#fff;box-shadow:0 20px 40px rgba(23,32,51,0.28);">
            <div style="font-size:11px;opacity:0.7;margin-bottom:10px;">常用操作</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <button data-action="capture-selection" style="border:0;border-radius:12px;padding:10px 12px;font-size:12px;font-weight:700;cursor:pointer;background:#ffb84d;color:#172033;">抓取当前选中文本</button>
              <button data-action="toggle-element-mode" style="border:0;border-radius:12px;padding:10px 12px;font-size:12px;font-weight:700;cursor:pointer;background:${state.elementPickMode ? "#ffd5a0" : "#ffffff"};color:#172033;">${state.elementPickMode ? "退出元素框选" : "开启元素框选"}</button>
              <button data-action="open-options" style="border:0;border-radius:12px;padding:10px 12px;font-size:12px;font-weight:700;cursor:pointer;background:#eff3ff;color:#172033;">打开模型配置</button>
              <button data-action="open-history" style="border:0;border-radius:12px;padding:10px 12px;font-size:12px;font-weight:700;cursor:pointer;background:#eef8f4;color:#172033;">查看书签整理</button>
            </div>
          </div>
        `
            : ""
        }

        ${
          state.expanded
            ? `
          <div style="width:360px;max-height:70vh;overflow:auto;border-radius:24px;padding:16px;background:rgba(255,255,255,0.97);color:#172033;border:1px solid rgba(23,32,51,0.1);box-shadow:0 24px 48px rgba(23,32,51,0.18);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <div>
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#b26a00;font-weight:800;">Smart Favorites</div>
                <div style="font-size:20px;font-weight:800;">内容抓取面板</div>
              </div>
              <button data-action="collapse-panel" style="border:0;border-radius:12px;padding:8px 10px;background:#172033;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">收起</button>
            </div>
            <div style="font-size:12px;color:#627089;margin-bottom:10px;line-height:1.6;">${escapeHtml(state.status)}</div>
            <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
              <button data-action="capture-selection" style="border:0;border-radius:12px;padding:10px 12px;font-size:12px;font-weight:700;cursor:pointer;background:#ffb84d;color:#172033;">添加当前选中</button>
              <button data-action="toggle-element-mode" style="border:0;border-radius:12px;padding:10px 12px;font-size:12px;font-weight:700;cursor:pointer;background:${state.elementPickMode ? "#ffd9ad" : "#eef3ff"};color:#172033;">${state.elementPickMode ? "退出框选模式" : "元素框选模式"}</button>
              <button data-action="open-history" style="border:0;border-radius:12px;padding:10px 12px;font-size:12px;font-weight:700;cursor:pointer;background:#eef8f4;color:#172033;">打开书签整理页</button>
            </div>
            ${
              selection
                ? `<div style="background:#fff6df;border-radius:14px;padding:12px;margin-bottom:12px;font-size:12px;line-height:1.6;">
                  <div style="font-weight:800;margin-bottom:6px;">当前选中文本</div>
                  <div>${escapeHtml(selection.slice(0, 280))}</div>
                </div>`
                : ""
            }
            <div style="display:flex;flex-direction:column;gap:10px;">${snippets}</div>
          </div>
        `
            : ""
        }

        <div style="display:flex;gap:10px;">
          <button data-action="toggle-menu" style="width:54px;height:54px;border-radius:50%;border:0;background:linear-gradient(135deg,#172033 0%,#2f4a73 55%,#ffb84d 100%);color:#fff;font-weight:800;cursor:pointer;box-shadow:0 18px 30px rgba(23,32,51,0.28);">AI</button>
          <button data-action="toggle-panel" style="padding:0 18px;height:54px;border-radius:18px;border:0;background:rgba(255,255,255,0.96);color:#172033;font-weight:800;cursor:pointer;box-shadow:0 18px 30px rgba(23,32,51,0.18);">${state.expanded ? "收起抓取面板" : "展开抓取面板"}</button>
        </div>
      </div>
    </div>
  `
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

async function captureSelection() {
  const text = currentSelectionText()

  if (text.length < 2) {
    state.status = "先在页面中选中一段文字。"
    renderOverlay()
    return
  }

  await storeSnippet(createSnippet("selection", text.slice(0, 2000), "selection"))
  state.status = "已把选中文本加入内容面板。"
  state.expanded = true
  renderOverlay()
}

function bindOverlayEvents() {
  rootElement().addEventListener("click", async (event) => {
    const target = event.target

    if (!(target instanceof HTMLElement)) {
      return
    }

    const action = target.dataset.action
    if (!action) {
      return
    }

    if (action === "toggle-menu") {
      state.menuOpen = !state.menuOpen
      renderOverlay()
      return
    }

    if (action === "toggle-panel") {
      state.expanded = !state.expanded
      renderOverlay()
      return
    }

    if (action === "collapse-panel") {
      state.expanded = false
      renderOverlay()
      return
    }

    if (action === "toggle-element-mode") {
      state.elementPickMode = !state.elementPickMode
      state.menuOpen = false
      state.status = state.elementPickMode
        ? "元素框选模式已开启，点击页面区域即可加入内容。"
        : "元素框选模式已关闭。"
      renderOverlay()
      return
    }

    if (action === "capture-selection") {
      state.menuOpen = false
      await captureSelection()
      return
    }

    if (action === "open-options") {
      await openExtensionPage("options.html")
      return
    }

    if (action === "open-history") {
      await openExtensionPage("options.html#history")
      return
    }

    if (action === "delete-snippet") {
      const snippetId = target.dataset.snippetId
      if (snippetId) {
        await removeSnippet(snippetId)
      }
    }
  })
}

function bindElementPicker() {
  const highlight = ensureHighlightBox()

  document.addEventListener(
    "mousemove",
    (event) => {
      if (!state.elementPickMode) {
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
    },
    true
  )

  document.addEventListener(
    "click",
    async (event) => {
      if (!state.elementPickMode) {
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
        state.status = "这个元素内容太短，换一个块级区域。"
        renderOverlay()
        return
      }

      await storeSnippet(
        createSnippet(
          "element",
          text.slice(0, 2000),
          target.tagName.toLowerCase(),
          cssPathFor(target)
        )
      )

      state.status = `已加入元素内容：${target.tagName.toLowerCase()}`
      state.expanded = true
      state.elementPickMode = false
      highlight.style.display = "none"
      renderOverlay()
    },
    true
  )
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "smart-favorites/capture-page") {
    return
  }

  sendResponse({
    page: getPageContext(),
    selectionText: currentSelectionText(),
    snippets: state.draft.snippets,
    extractedAt: new Date().toISOString()
  } satisfies CapturePageResponse)
})

void fetchDraft()
bindOverlayEvents()
bindElementPicker()
renderOverlay()
