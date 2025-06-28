/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from '@/plugins'

// Components
import App from './App.vue'

// Composables
import { createApp } from 'vue'

// Import Codex global CSS so Codex components are styled throughout the app
import '@wikimedia/codex/dist/codex.style.css';
import './styles/codex-tokens.css';

const app = createApp(App)

registerPlugins(app)

app.mount('#app')
