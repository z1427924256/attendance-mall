import { computed, ref } from 'vue';

const STORAGE_KEY = 'admin-theme';
type ThemeMode = 'light' | 'dark';

// 模块级共享状态（单例），保证 App.vue 与 AdminLayout.vue 使用同一份主题
const isDark = ref(false);

function applyHtmlClass() {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  if (isDark.value) {
    el.classList.add('dark');
  } else {
    el.classList.remove('dark');
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, isDark.value ? 'dark' : 'light');
  } catch {
    // ignore
  }
}

function setTheme(dark: boolean) {
  isDark.value = dark;
  persist();
  applyHtmlClass();
}

function toggleTheme() {
  setTheme(!isDark.value);
}

/** 从 localStorage 读取初始主题并应用到 html class（防闪屏） */
export function initTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    isDark.value = saved === 'dark';
  } catch {
    isDark.value = false;
  }
  applyHtmlClass();
}

// Arco ConfigProvider 的 theme 属性：'' | 'dark'
const themeForArco = computed(() => (isDark.value ? 'dark' : ''));

export function useTheme() {
  return {
    isDark,
    theme: themeForArco,
    toggleTheme,
    setTheme,
  };
}

// 模块加载时立即初始化一次
initTheme();
