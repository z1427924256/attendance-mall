import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import ArcoVue from '@arco-design/web-vue';
import ArcoVueIcon from '@arco-design/web-vue/es/icon';
import { initVChartArcoTheme } from '@visactor/vchart-arco-theme';
import App from './App.vue';
import router from './router';
import './assets/styles/global.css';

// 初始化 VChart Arco 主题（自动适配 Arco 色板 + 亮暗模式）
initVChartArcoTheme();

const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(pinia);
app.use(router);
app.use(ArcoVue, {
  // 全局配置：贴合 Arco 设计原则
  locale: undefined,
});
app.use(ArcoVueIcon);

app.mount('#app');
