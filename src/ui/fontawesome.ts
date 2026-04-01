import { library } from "@fortawesome/fontawesome-svg-core"
import {
    faArrowsRotate,
    faBolt,
    faBookmark,
    faCheck,
    faChevronRight,
    faClock,
    faEye,
    faEyeSlash,
    faFileExport,
    faFloppyDisk,
    faFolderPlus,
    faFolderOpen,
    faFolderTree,
    faGear,
    faHighlighter,
    faLink,
    faPlus,
    faRotateLeft,
    faRotateRight,
    faTrash,
    faVectorSquare,
    faWandMagicSparkles
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome"
import type { App } from "vue"

let initialized = false

export const ensureFontAwesome = () => {
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
        faEye,
        faEyeSlash,
        faFileExport,
        faFloppyDisk,
        faFolderPlus,
        faFolderOpen,
        faFolderTree,
        faGear,
        faHighlighter,
        faLink,
        faPlus,
        faRotateLeft,
        faRotateRight,
        faTrash,
        faVectorSquare,
        faWandMagicSparkles
    )

    initialized = true
}

export const registerFontAwesome = (app: App) => {
    ensureFontAwesome()
    app.component("font-awesome-icon", FontAwesomeIcon)
}

export { FontAwesomeIcon }
