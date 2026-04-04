import { library } from "@fortawesome/fontawesome-svg-core"
import {
  faArrowsRotate,
  faBolt,
  faBookOpen,
  faBookmark,
  faBrain,
  faCheck,
  faChevronDown,
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
  faGlobe,
  faHighlighter,
  faLink,
  faMessage,
  faPenToSquare,
  faPlus,
  faRobot,
  faRotateLeft,
  faRotateRight,
  faTrash,
  faUpRightFromSquare,
  faVectorSquare,
  faXmark,
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
    faBookOpen,
    faBookmark,
    faBrain,
    faCheck,
    faChevronDown,
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
    faGlobe,
    faHighlighter,
    faLink,
    faMessage,
    faPenToSquare,
    faPlus,
    faRobot,
    faRotateLeft,
    faRotateRight,
    faTrash,
    faUpRightFromSquare,
    faVectorSquare,
    faXmark,
    faWandMagicSparkles
  )

  initialized = true
}

export const registerFontAwesome = (app: App) => {
  ensureFontAwesome()
  app.component("font-awesome-icon", FontAwesomeIcon)
}

export { FontAwesomeIcon }
