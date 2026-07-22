import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import ArcoVue from '@arco-design/web-vue';
import ArcoVueIcon from '@arco-design/web-vue/es/icon';
import { initVChartArcoTheme } from '@visactor/vchart-arco-theme';
import { MotionPlugin } from '@vueuse/motion';
import App from './App.vue';
import router from './router';
import { initTheme } from './composables/useTheme';
// 全量引入 Arco 样式（包含 [arco-theme="dark"] 暗黑变量覆盖，按需引入不含此部分）
import '@arco-design/web-vue/dist/arco.css';
import './assets/styles/global.css';

// 初始化 VChart Arco 主题（自动适配 Arco 色板 + 亮暗模式）
initVChartArcoTheme();

// 在应用挂载前根据 localStorage 设置初始主题与 html class（防闪屏）
initTheme();

const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(pinia);
app.use(router);
app.use(MotionPlugin);
app.use(ArcoVue, {
  // 全局配置：贴合 Arco 设计原则
  locale: undefined,
});
app.use(ArcoVueIcon);

app.mount('#app');
