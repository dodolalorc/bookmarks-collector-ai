import { createApp } from "vue"

import "./ui/design-tokens.css"

import { registerFontAwesome } from "./ui/fontawesome"
import PopupApp from "./views/PopupApp.vue"

const app = createApp(PopupApp)
registerFontAwesome(app)
app.mount("#__plasmo")
