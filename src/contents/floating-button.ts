import type { PlasmoCSConfig } from "plasmo"
import { createApp } from "vue"

import FloatingButton from "./FloatingButton.vue"

export const config: PlasmoCSConfig = {
    matches: ["http://*/*", "https://*/*"]
}

function mount() {
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
