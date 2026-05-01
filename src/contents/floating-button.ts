import type { PlasmoCSConfig } from "plasmo"
import { createApp } from "vue"

import FloatingButton from "./FloatingButton.vue"

export const config: PlasmoCSConfig = {
    matches: ["http://*/*", "https://*/*"]
}

// Legacy entry is intentionally disabled.
// Unified floating entrance is provided by page-capture.ts + PageCaptureOverlay.vue.
const ENABLE_LEGACY_FLOATING_BUTTON = false

function mount() {
    if (!ENABLE_LEGACY_FLOATING_BUTTON) return
    if (document.getElementById("kc-float-root")) return

    const container = document.createElement("div")
    container.id = "kc-float-root"
    document.body.appendChild(container)

    createApp(FloatingButton).mount(container)
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount)
} else {
    mount()
}
