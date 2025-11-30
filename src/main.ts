import { createApp, ref } from 'vue'
import AppContainer from './AppContainer.vue'

import { darkTheme, type GlobalTheme } from 'naive-ui'

createApp(AppContainer).mount('#app')

const theme = ref<GlobalTheme | null>(null);
theme.value = darkTheme;