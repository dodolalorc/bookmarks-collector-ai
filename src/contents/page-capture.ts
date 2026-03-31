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
const SIDEBAR_WIDTH = 348

type OverlayState = {
  draft: PageCaptureDraft
  sidebarOpen: boolean
  elementPickMode: boolean
  status: string
  bookmarkPromptVisible: boolean
}

const state: OverlayState = {
  draft: {
    url: location.href,
    snippets: [],
    updatedAt: new Date().toISOString()
  },
  sidebarOpen: false,
  elementPickMode: false,
  status: "等待抓取",
  bookmarkPromptVisible: false
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
      border: "1.5px solid #ff7ed9",
      background: "rgba(128, 216, 255, 0.16)",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.65) inset",
      zIndex: "2147483645",
      display: "none",
      borderRadius: "10px"
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function snippetMarkup(snippet: CapturedSnippet) {
  return `
    <div style="border:1px solid rgba(112,135,168,0.14);border-radius:18px;padding:12px;background:linear-gradient(180deg,#ffffff 0%,#f7fbff 100%);box-shadow:0 8px 20px rgba(101,133,173,0.08);">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:8px;">
        <div>
          <div style="font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#6d7fb0;">${snippet.mode === "selection" ? "Selection" : "Element"}</div>
          <div style="font-size:12px;color:#7f8ca6;margin-top:3px;">${escapeHtml(snippet.label)}</div>
        </div>
        <button data-action="delete-snippet" data-snippet-id="${snippet.id}" style="border:0;border-radius:999px;padding:6px 9px;background:#eef4ff;color:#5d6f98;font-size:11px;font-weight:800;cursor:pointer;">删除</button>
      </div>
      ${
        snippet.selector
          ? `<div style="font-size:11px;color:#8d99b3;word-break:break-all;margin-bottom:8px;">${escapeHtml(snippet.selector)}</div>`
          : ""
      }
      <div style="font-size:12px;line-height:1.7;color:#25324d;">${escapeHtml(snippet.text.slice(0, 420))}</div>
    </div>
  `
}

function renderOverlay() {
  const root = rootElement()
  const selection = currentSelectionText()
  const sidebarTransform = state.sidebarOpen
    ? "translateX(0)"
    : `translateX(${SIDEBAR_WIDTH + 28}px)`

  root.innerHTML = `
    <div style="position:fixed;inset:0;pointer-events:none;z-index:2147483646;font-family:'SF Pro Text','Segoe UI','PingFang SC','Hiragino Sans GB',sans-serif;">
      ${
        state.bookmarkPromptVisible
          ? `
        <div style="position:fixed;right:72px;top:86px;pointer-events:auto;max-width:240px;border-radius:18px;padding:14px 14px 12px;background:linear-gradient(135deg,#fff9ff 0%,#f4fbff 55%,#edf8ff 100%);border:1px solid rgba(132,174,224,0.24);box-shadow:0 18px 34px rgba(93,118,164,0.18);">
          <div style="font-size:13px;font-weight:800;color:#2b3962;margin-bottom:6px;">已检测到你收藏了当前页面</div>
          <div style="font-size:12px;line-height:1.6;color:#6d7994;margin-bottom:10px;">要不要现在整理标签并补充当前页的小知识点？</div>
          <div style="display:flex;gap:8px;">
            <button data-action="classify-now" style="pointer-events:auto;border:0;border-radius:999px;padding:8px 11px;background:linear-gradient(135deg,#ff8ed8 0%,#8ad8ff 100%);color:#21304f;font-size:11px;font-weight:800;cursor:pointer;">立即分类标签</button>
            <button data-action="dismiss-bookmark-prompt" style="pointer-events:auto;border:0;border-radius:999px;padding:8px 11px;background:#eef4ff;color:#7083a6;font-size:11px;font-weight:800;cursor:pointer;">稍后</button>
          </div>
        </div>
      `
          : ""
      }

      <button data-action="toggle-sidebar" style="position:fixed;right:20px;top:84px;pointer-events:auto;width:20px;height:20px;border-radius:50%;border:1px solid rgba(255,255,255,0.72);background:radial-gradient(circle at 30% 30%,#ffd8f3 0%,#a8e8ff 48%,#7ca5ff 100%);box-shadow:0 8px 20px rgba(97,130,179,0.24);cursor:pointer;"></button>

      <aside style="position:fixed;right:18px;top:56px;bottom:20px;width:${SIDEBAR_WIDTH}px;pointer-events:auto;transform:${sidebarTransform};transition:transform 180ms ease;display:flex;flex-direction:column;border-radius:28px;overflow:hidden;background:linear-gradient(180deg,rgba(255,249,255,0.98) 0%,rgba(244,250,255,0.98) 42%,rgba(238,247,255,0.98) 100%);border:1px solid rgba(136,176,224,0.18);box-shadow:0 28px 60px rgba(99,129,173,0.20);backdrop-filter:blur(18px);">
        <div style="padding:18px 18px 14px;border-bottom:1px solid rgba(136,176,224,0.14);background:linear-gradient(135deg,rgba(255,217,244,0.58) 0%,rgba(213,243,255,0.68) 65%,rgba(240,248,255,0.76) 100%);">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
            <div>
              <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#7d88b1;font-weight:800;">Current Bookmark</div>
              <div style="font-size:22px;line-height:1.05;font-weight:900;color:#25324d;margin-top:6px;">页面知识抓取</div>
              <div style="font-size:12px;line-height:1.6;color:#6e7997;margin-top:8px;">统一收集当前书签页下的小知识点，不做分类拆分。</div>
            </div>
            <button data-action="toggle-sidebar" style="border:0;border-radius:999px;padding:8px 10px;background:rgba(255,255,255,0.74);color:#69779a;font-size:11px;font-weight:800;cursor:pointer;">收起</button>
          </div>
          <div style="margin-top:12px;font-size:12px;line-height:1.6;color:#65728f;">${escapeHtml(state.status)}</div>
        </div>

        <div style="padding:16px 16px 0;display:flex;gap:8px;flex-wrap:wrap;">
          <button data-action="capture-selection" style="border:0;border-radius:999px;padding:10px 12px;background:linear-gradient(135deg,#ffd6f1 0%,#bee8ff 100%);color:#23314d;font-size:12px;font-weight:800;cursor:pointer;">抓取当前选中</button>
          <button data-action="toggle-element-mode" style="border:0;border-radius:999px;padding:10px 12px;background:${state.elementPickMode ? "linear-gradient(135deg,#ffc5e8 0%,#a9e1ff 100%)" : "#edf5ff"};color:#546786;font-size:12px;font-weight:800;cursor:pointer;">${state.elementPickMode ? "退出框选模式" : "开启框选模式"}</button>
        </div>

        ${
          selection
            ? `
          <div style="margin:14px 16px 0;border-radius:18px;padding:12px 13px;background:linear-gradient(135deg,#fff1fa 0%,#eef9ff 100%);border:1px solid rgba(150,195,235,0.18);">
            <div style="font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#7c86ad;margin-bottom:6px;">Current Selection</div>
            <div style="font-size:12px;line-height:1.65;color:#31415f;">${escapeHtml(selection.slice(0, 280))}</div>
          </div>
        `
            : ""
        }

        <div style="padding:14px 16px 16px;overflow:auto;display:flex;flex-direction:column;gap:12px;flex:1;">
          ${
            state.draft.snippets.length === 0
              ? `
            <div style="border-radius:20px;padding:16px;background:rgba(255,255,255,0.7);border:1px dashed rgba(126,169,220,0.28);font-size:12px;line-height:1.7;color:#72809e;">
              这里会展示当前书签页提取出的多个小知识点。你可以先选中文字直接加入，也可以开启框选模式点击页面区域。
            </div>
          `
              : state.draft.snippets.map(snippetMarkup).join("")
          }
        </div>

        <div style="padding:12px 16px 16px;border-top:1px solid rgba(136,176,224,0.12);display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <div style="font-size:11px;color:#8591ac;">模型配置和书签整理保留在管理页中</div>
          <div style="display:flex;gap:8px;">
            <button data-action="open-options" style="border:0;border-radius:999px;padding:8px 10px;background:#eef4ff;color:#657899;font-size:11px;font-weight:800;cursor:pointer;">模型配置</button>
            <button data-action="open-history" style="border:0;border-radius:999px;padding:8px 10px;background:#eef4ff;color:#657899;font-size:11px;font-weight:800;cursor:pointer;">书签整理</button>
          </div>
        </div>
      </aside>
    </div>
  `
}

async function captureSelection() {
  const text = currentSelectionText()

  if (text.length < 2) {
    state.status = "先在页面中选中一段文字。"
    renderOverlay()
    return
  }

  await storeSnippet(createSnippet("selection", text.slice(0, 2000), "selection"))
  state.status = "已把选中文本加入当前书签页知识列表。"
  state.sidebarOpen = true
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

    if (action === "toggle-sidebar") {
      state.sidebarOpen = !state.sidebarOpen
      renderOverlay()
      return
    }

    if (action === "toggle-element-mode") {
      state.elementPickMode = !state.elementPickMode
      state.sidebarOpen = true
      state.status = state.elementPickMode
        ? "框选模式已开启，点击页面区域即可抓取一段内容。"
        : "框选模式已关闭。"
      renderOverlay()
      return
    }

    if (action === "capture-selection") {
      await captureSelection()
      return
    }

    if (action === "delete-snippet") {
      const snippetId = target.dataset.snippetId
      if (snippetId) {
        await removeSnippet(snippetId)
      }
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

    if (action === "classify-now") {
      state.bookmarkPromptVisible = false
      state.sidebarOpen = true
      state.status = "已打开当前书签页侧边栏，你可以先补充关键知识点，再进行分类。"
      renderOverlay()
      return
    }

    if (action === "dismiss-bookmark-prompt") {
      state.bookmarkPromptVisible = false
      renderOverlay()
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
        state.status = "这个区域内容太短，换一个更完整的内容块。"
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

      state.status = `已加入一个页面区域：${target.tagName.toLowerCase()}`
      state.sidebarOpen = true
      state.elementPickMode = false
      state.bookmarkPromptVisible = false
      highlight.style.display = "none"
      renderOverlay()
    },
    true
  )
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "smart-favorites/capture-page") {
    sendResponse({
      page: getPageContext(),
      selectionText: currentSelectionText(),
      snippets: state.draft.snippets,
      extractedAt: new Date().toISOString()
    } satisfies CapturePageResponse)
    return
  }

  if (message?.type === "smart-favorites/bookmark-created") {
    state.bookmarkPromptVisible = true
    state.status = "检测到你刚刚收藏了当前页面。"
    renderOverlay()

    window.setTimeout(() => {
      if (state.bookmarkPromptVisible) {
        state.bookmarkPromptVisible = false
        renderOverlay()
      }
    }, 12000)
  }
})

void fetchDraft()
bindOverlayEvents()
bindElementPicker()
renderOverlay()
