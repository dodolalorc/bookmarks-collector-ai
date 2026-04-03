export const ROOT_ID = "bookmarks-collector-overlay-root"
export const HIGHLIGHT_ID = "bookmarks-collector-highlight-box"
const CAPTURE_STYLE_ID = "bookmarks-collector-capture-style"

export const ensureCaptureStyles = () => {
    if (document.getElementById(CAPTURE_STYLE_ID)) {
        return
    }

    const style = document.createElement("style")
    style.id = CAPTURE_STYLE_ID
    style.textContent = `
#${HIGHLIGHT_ID} {
  position: absolute;
  pointer-events: none;
  border: 1.5px solid #ff7ed9;
  background: rgba(128, 216, 255, 0.16);
  box-shadow: 0 0 0 1px rgba(255,255,255,0.65) inset;
  z-index: 2147483645;
  display: none;
  border-radius: 10px;
}
`
    document.documentElement.appendChild(style)
}

export const ensureOverlayRoot = () => {
    let root = document.getElementById(ROOT_ID)

    if (!root) {
        root = document.createElement("div")
        root.id = ROOT_ID
        document.documentElement.appendChild(root)
    }

    return root
}

export const ensureHighlightBox = () => {
    let box = document.getElementById(HIGHLIGHT_ID)

    if (!box) {
        box = document.createElement("div")
        box.id = HIGHLIGHT_ID
        document.documentElement.appendChild(box)
    }

    return box
}

export const hideHighlight = (highlight: HTMLElement) => {
    highlight.style.display = "none"
}

export const updateHighlightRect = (
    highlight: HTMLElement,
    rect: DOMRect,
    scrollX: number,
    scrollY: number
) => {
    highlight.style.display = "block"
    highlight.style.left = `${rect.left + scrollX}px`
    highlight.style.top = `${rect.top + scrollY}px`
    highlight.style.width = `${rect.width}px`
    highlight.style.height = `${rect.height}px`
}
