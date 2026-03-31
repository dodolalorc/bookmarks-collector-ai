import { library } from "@fortawesome/fontawesome-svg-core"
import {
    faArrowsRotate,
    faBolt,
    faBookmark,
    faCheck,
    faChevronRight,
    faClock,
    faFileExport,
    faFloppyDisk,
    faFolderOpen,
    faFolderTree,
    faGear,
    faHighlighter,
    faLink,
    faRotateLeft,
    faRotateRight,
    faVectorSquare,
    faWandMagicSparkles
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome"
import type { App } from "vue"

let initialized = false

const ensureLibrary = () => {
    if (initialized) {
        return
    }

    library.add(
        faArrowsRotate,
        faBolt,
        faBookmark,
        faCheck,
        faChevronRight,
        faClock,
        faFileExport,
        faFloppyDisk,
        faFolderOpen,
        faFolderTree,
        faGear,
        faHighlighter,
        faLink,
        faRotateLeft,
        faRotateRight,
        faVectorSquare,
        faWandMagicSparkles
    )

    initialized = true
}

export const registerFontAwesome = (app: App) => {
    ensureLibrary()
    app.component("font-awesome-icon", FontAwesomeIcon)
}
