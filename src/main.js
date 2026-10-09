import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
// Nunito is served with the app (no request to Google Fonts before text can render)
import '@fontsource/nunito/500.css'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import '@fontsource/nunito/800.css'
import './assets/tokens.css'

createApp(App).use(router).use(vuetify).mount('#app')
