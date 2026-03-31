import type { PlasmoCSConfig } from "plasmo"
import { createApp, reactive } from "vue"

import type {
  CapturedSnippet,
  CapturePageResponse,
  PageCaptureDraft,
  PageContext
} from "../sdk/types"
import PageCaptureOverlay from "./PageCaptureOverlay.vue"
const ROOT_ID = "smart-favorites-overlay-root"
const HIGHLIGHT_ID = "smart-favorites-highlight-box"
const SIDEBAR_WIDTH = 348
const PAGE_INSET_TRANSITION = "margin-right 220ms ease"

const originalPageLayout = {
  htmlMarginRight: document.documentElement.style.marginRight,
  htmlTransition: document.documentElement.style.transition,
  bodyMarginRight: document.body?.style.marginRight ?? "",
  bodyTransition: document.body?.style.transition ?? ""
}

type OverlayState = {
  draft: PageCaptureDraft
  sidebarOpen: boolean
  elementPickMode: boolean
  status: string
  bookmarkPromptVisible: boolean
  selectionText: string
}

const state = reactive<OverlayState>({
  draft: {
    url: location.href,
    snippets: [],
    updatedAt: new Date().toISOString()
  },
  sidebarOpen: false,
  elementPickMode: false,
  status: "等待抓取",
  bookmarkPromptVisible: false,
  selectionText: ""
})

let overlayMounted = false

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

function syncPageInset() {
  if (state.sidebarOpen) {
    const inset = `${SIDEBAR_WIDTH}px`
    document.documentElement.style.transition = PAGE_INSET_TRANSITION
    document.documentElement.style.marginRight = inset

    if (document.body) {
      document.body.style.transition = PAGE_INSET_TRANSITION
      document.body.style.marginRight = inset
    }

    return
  }

  document.documentElement.style.marginRight = originalPageLayout.htmlMarginRight
  document.documentElement.style.transition = originalPageLayout.htmlTransition

  if (document.body) {
    document.body.style.marginRight = originalPageLayout.bodyMarginRight
    document.body.style.transition = originalPageLayout.bodyTransition
  }
}

function renderOverlay() {
  state.selectionText = currentSelectionText()

  syncPageInset()

  if (overlayMounted) {
    return
  }

  overlayMounted = true

  createApp(PageCaptureOverlay, {
    sidebarWidth: SIDEBAR_WIDTH,
    state,
    onToggleSidebar: () => {
      state.sidebarOpen = !state.sidebarOpen
      renderOverlay()
    },
    onCaptureSelection: () => {
      void captureSelection()
    },
    onToggleElementMode: () => {
      state.elementPickMode = !state.elementPickMode
      state.sidebarOpen = true
      state.status = state.elementPickMode
        ? "框选模式已开启，点击页面区域即可抓取一段内容。"
        : "框选模式已关闭。"
      renderOverlay()
    },
    onDeleteSnippet: (snippetId: string) => {
      void removeSnippet(snippetId).then(() => renderOverlay())
    },
    onOpenOptions: () => {
      void openExtensionPage("options.html")
    },
    onOpenHistory: () => {
      void openExtensionPage("options.html#history")
    },
    onClassifyNow: () => {
      state.bookmarkPromptVisible = false
      state.sidebarOpen = true
      state.status = "已打开当前书签页侧边栏，你可以先补充关键知识点，再进行分类。"
      renderOverlay()
    },
    onDismissBookmarkPrompt: () => {
      state.bookmarkPromptVisible = false
      renderOverlay()
    }
  }).mount(rootElement())
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
    state.selectionText = currentSelectionText()
    sendResponse({
      page: getPageContext(),
      selectionText: state.selectionText,
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
bindElementPicker()
renderOverlay()
