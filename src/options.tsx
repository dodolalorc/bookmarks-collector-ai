import { createApp } from "vue"

import "./ui/design-tokens.css"

import { registerFontAwesome } from "./ui/fontawesome"
import OptionsApp from "./views/OptionsApp.vue"

const app = createApp(OptionsApp)
registerFontAwesome(app)
app.mount("#__plasmo")
