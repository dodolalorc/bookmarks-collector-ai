import type { PlasmoCSConfig } from "plasmo"
import { createApp, reactive } from "vue"
import "../ui/design-tokens.css"

import { registerFontAwesome } from "../ui/fontawesome"
import type {
  CapturedSnippet,
  CapturePageResponse,
  PageCaptureDraft
} from "../sdk/types"
import {
  ROOT_ID,
  ensureCaptureStyles,
  ensureHighlightBox,
  ensureOverlayRoot,
  hideHighlight,
  updateHighlightRect
} from "./capture/dom"
import {
  createSnippet,
  cssPathFor,
  getCurrentSelectionText,
  getPageContext
} from "./capture/extract"
import PageCaptureOverlay from "./PageCaptureOverlay.vue"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

const SIDEBAR_WIDTH = 348

type OverlayState = {
  draft: PageCaptureDraft
  sidebarOpen: boolean
  elementPickMode: boolean
  status: string
  bookmarkPromptVisible: boolean
  selectionText: string
  selectionAnchorVisible: boolean
  selectionAnchorHovered: boolean
  selectionAnchor: {
    top: number
    left: number
  }
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
  selectionText: "",
  selectionAnchorVisible: false,
  selectionAnchorHovered: false,
  selectionAnchor: {
    top: 0,
    left: 0
  }
})

let overlayMounted = false

const sendMessage = async <T>(type: string, payload?: unknown) => {
  const response = await chrome.runtime.sendMessage({
    type,
    payload
  })

  if (!response?.ok) {
    throw new Error(response?.error || "内容脚本消息失败")
  }

  return response.payload as T
}

const fetchDraft = async () => {
  state.draft = await sendMessage<PageCaptureDraft>(
    "smart-favorites/get-capture-draft",
    location.href
  )
  renderOverlay()
}

const storeSnippet = async (snippet: CapturedSnippet) => {
  state.draft = await sendMessage<PageCaptureDraft>(
    "smart-favorites/add-captured-snippet",
    {
      url: location.href,
      snippet
    }
  )
  renderOverlay()
}

const removeSnippet = async (snippetId: string) => {
  state.draft = await sendMessage<PageCaptureDraft>(
    "smart-favorites/remove-captured-snippet",
    {
      url: location.href,
      snippetId
    }
  )
  renderOverlay()
}

const analyzeSnippet = async (snippetId: string) => {
  state.status = "正在分析该段内容…"
  renderOverlay()

  state.draft = await sendMessage<PageCaptureDraft>(
    "smart-favorites/analyze-captured-snippet",
    {
      url: location.href,
      snippetId
    }
  )

  state.status = "已完成段落分析。"
  renderOverlay()
}

const analyzeAllSnippets = async (force = false) => {
  state.status = force ? "正在重新分析全部段落…" : "正在分析全部段落…"
  renderOverlay()

  state.draft = await sendMessage<PageCaptureDraft>(
    "smart-favorites/analyze-all-captured-snippets",
    {
      url: location.href,
      force
    }
  )

  state.status = force ? "全部段落已重新分析。" : "全部段落已分析完成。"
  renderOverlay()
}

const openExtensionPage = async (path: string) => {
  await sendMessage<{ success: boolean }>("smart-favorites/open-extension-page", {
    path
  })
}

const renderOverlay = () => {
  state.selectionText = getCurrentSelectionText()

  if (overlayMounted) {
    return
  }

  overlayMounted = true

  const app = createApp(PageCaptureOverlay, {
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
    onAnalyzeSnippet: (snippetId: string) => {
      void analyzeSnippet(snippetId)
    },
    onAnalyzeAllSnippets: () => {
      void analyzeAllSnippets(false)
    },
    onReanalyzeAllSnippets: () => {
      void analyzeAllSnippets(true)
    },
    onOpenOptions: () => {
      void openExtensionPage("tabs/manage.html")
    },
    onOpenHistory: () => {
      void openExtensionPage("tabs/manage.html#history")
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
    },
    onShowSelectionPrompt: () => {
      state.selectionAnchorHovered = true
      renderOverlay()
    },
    onHideSelectionPrompt: () => {
      window.setTimeout(() => {
        state.selectionAnchorHovered = false
        renderOverlay()
      }, 120)
    }
  })

  registerFontAwesome(app)
  app.mount(ensureOverlayRoot())
}

const captureSelection = async () => {
  const text = getCurrentSelectionText()

  if (text.length < 2) {
    state.status = "先在页面中选中一段文字。"
    renderOverlay()
    return
  }

  await storeSnippet(createSnippet("selection", text.slice(0, 2000), "selection"))
  state.status = "已把选中文本加入当前书签页知识列表。"
  state.sidebarOpen = true
  state.selectionAnchorVisible = false
  state.selectionAnchorHovered = false
  renderOverlay()
}

const updateSelectionAnchor = () => {
  const selection = window.getSelection?.()
  const text = selection?.toString().trim() ?? ""

  if (!selection || selection.rangeCount === 0 || text.length < 2) {
    state.selectionAnchorVisible = false
    state.selectionAnchorHovered = false
    renderOverlay()
    return
  }

  const range = selection.getRangeAt(0).cloneRange()
  const rects = range.getClientRects()
  const lastRect = rects[rects.length - 1]

  if (!lastRect) {
    state.selectionAnchorVisible = false
    state.selectionAnchorHovered = false
    renderOverlay()
    return
  }

  state.selectionText = text
  state.selectionAnchorVisible = true
  state.selectionAnchor.top = Math.min(lastRect.bottom + 10, window.innerHeight - 18)
  state.selectionAnchor.left = Math.min(lastRect.right + 8, window.innerWidth - 18)
  renderOverlay()
}

const bindElementPicker = () => {
  const highlight = ensureHighlightBox() as HTMLElement

  document.addEventListener(
    "mousemove",
    (event) => {
      if (!state.elementPickMode) {
        hideHighlight(highlight)
        return
      }

      const target = event.target
      if (!(target instanceof Element) || target.closest(`#${ROOT_ID}`)) {
        hideHighlight(highlight)
        return
      }

      const rect = target.getBoundingClientRect()
      updateHighlightRect(highlight, rect, window.scrollX, window.scrollY)
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
      state.bookmarkPromptVisible = false
      hideHighlight(highlight)
      renderOverlay()
    },
    true
  )
}

ensureCaptureStyles()

document.addEventListener("selectionchange", () => {
  window.requestAnimationFrame(updateSelectionAnchor)
})

document.addEventListener(
  "mousedown",
  (event) => {
    const target = event.target
    if (target instanceof Element && target.closest(`#${ROOT_ID}`)) {
      return
    }

    if (state.selectionAnchorHovered) {
      return
    }

    state.selectionAnchorVisible = false
    state.selectionAnchorHovered = false
    renderOverlay()
  },
  true
)

window.addEventListener("scroll", () => {
  if (state.selectionAnchorVisible) {
    updateSelectionAnchor()
  }
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "smart-favorites/capture-page") {
    state.selectionText = getCurrentSelectionText()
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
