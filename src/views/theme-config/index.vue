<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { Message } from '@arco-design/web-vue';
import * as api from '@/api/client';

const DEFAULT_COLOR = '#165DFF';

// 6-8 个预设主题色
const PRESETS = [
  { color: '#165DFF', name: '极客蓝' },
  { color: '#00B42A', name: '绿洲' },
  { color: '#FF7D00', name: '蜜橙' },
  { color: '#F53F3F', name: '霞红' },
  { color: '#722ED1', name: '紫' },
  { color: '#0FC6C2', name: '青' },
  { color: '#EB2F96', name: '品红' },
  { color: '#86909C', name: '中性灰' },
];

const themeColor = ref(DEFAULT_COLOR);
const savedColor = ref(DEFAULT_COLOR);
const saving = ref(false);
const loading = ref(false);

// hex -> "r, g, b"（Arco 主题变量格式）
function hexToRgbStr(hex: string): string {
  const m = (hex || '').replace('#', '').trim();
  if (!/^[0-9a-fA-F]+$/.test(m)) return '22, 93, 255';
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  if (full.length !== 6) return '22, 93, 255';
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function applyTheme(color: string) {
  const rgb = hexToRgbStr(color);
  const el = document.documentElement;
  el.style.setProperty('--primary-6', rgb);
  el.style.setProperty('--arcoblue-6', rgb);
}

// 实时预览
watch(themeColor, (c) => applyTheme(c));

function selectPreset(color: string) {
  themeColor.value = color;
}

async function loadConfig() {
  loading.value = true;
  try {
    const cfg = await api.fetchSystemConfig();
    const c = (cfg.themeColor as string) ?? (cfg.theme_color as string) ?? DEFAULT_COLOR;
    themeColor.value = c;
    savedColor.value = c;
    applyTheme(c);
  } catch {
    Message.error('加载主题配置失败');
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  saving.value = true;
  try {
    await api.updateSystemConfig({ themeColor: themeColor.value });
    savedColor.value = themeColor.value;
    applyTheme(themeColor.value);
    Message.success('主题配置保存成功');
  } catch {
    Message.error('主题配置保存失败');
  } finally {
    saving.value = false;
  }
}

function handleReset() {
  themeColor.value = savedColor.value;
  applyTheme(savedColor.value);
}

onMounted(loadConfig);

// 离开页面时若未保存，恢复上次保存的主题色
onUnmounted(() => {
  applyTheme(savedColor.value);
});
</script>

<template>
  <div class="page-container">
    <a-card title="主题配置">
      <div class="toolbar">
        <span class="section-title">前端主题色</span>
        <a-space>
          <a-button :disabled="loading" @click="handleReset">
            <template #icon><icon-refresh /></template>
            恢复已保存
          </a-button>
          <a-button type="primary" :loading="saving" @click="handleSave">
            <template #icon><icon-save /></template>
            保存主题
          </a-button>
        </a-space>
      </div>

      <a-grid :cols="{ xs: 1, sm: 2 }" :col-gap="24" :row-gap="16">
        <!-- 左侧：颜色选择 + 预设色板 -->
        <a-grid-item>
          <div class="block">
            <div class="block-title">颜色选择</div>
            <div class="color-row">
              <input
                v-model="themeColor"
                type="color"
                class="color-input"
              />
              <a-input v-model="themeColor" style="width: 160px" placeholder="#165DFF" />
              <div
                class="color-preview"
                :style="{ background: themeColor }"
              ></div>
            </div>
          </div>

          <div class="block">
            <div class="block-title">预设色板</div>
            <div class="preset-grid">
              <div
                v-for="p in PRESETS"
                :key="p.color"
                class="preset-item"
                :class="{ active: themeColor.toUpperCase() === p.color.toUpperCase() }"
                @click="selectPreset(p.color)"
              >
                <div class="preset-swatch" :style="{ background: p.color }"></div>
                <span class="preset-name">{{ p.name }}</span>
              </div>
            </div>
          </div>
        </a-grid-item>

        <!-- 右侧：实时预览 -->
        <a-grid-item>
          <div class="block">
            <div class="block-title">实时预览</div>
            <div class="preview-panel">
              <div class="preview-row">
                <a-button type="primary">主要按钮</a-button>
                <a-button type="primary" status="success">成功按钮</a-button>
                <a-button type="primary" status="warning">警告按钮</a-button>
                <a-button type="primary" status="danger">危险按钮</a-button>
              </div>
              <div class="preview-row">
                <a-button>默认按钮</a-button>
                <a-button type="outline">描边按钮</a-button>
                <a-button type="dashed">虚线按钮</a-button>
                <a-button type="text">文字按钮</a-button>
              </div>
              <div class="preview-row">
                <a-tag color="arcoblue">主题标签</a-tag>
                <a-tag>默认标签</a-tag>
                <a-tag color="green">绿色标签</a-tag>
                <a-tag color="orange">橙色标签</a-tag>
                <a-tag color="red">红色标签</a-tag>
              </div>
              <div class="preview-row">
                <a-link>主题链接</a-link>
                <a-link status="success">成功链接</a-link>
                <a-link status="warning">警告链接</a-link>
                <a-link status="danger">危险链接</a-link>
              </div>
              <div class="preview-row">
                <a-switch :model-value="true" />
                <a-radio-group :model-value="'a'">
                  <a-radio value="a">选项 A</a-radio>
                  <a-radio value="b">选项 B</a-radio>
                </a-radio-group>
              </div>
              <div class="preview-row">
                <a-progress :percent="0.6" />
              </div>
              <div class="preview-row">
                <a-slider :model-value="40" />
              </div>
            </div>
          </div>
        </a-grid-item>
      </a-grid>
    </a-card>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-1);
}

.block {
  margin-bottom: 20px;
}

.block-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-2);
  margin-bottom: 12px;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-input {
  width: 40px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--color-neutral-3);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}

.color-preview {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid var(--color-neutral-3);
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.preset-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 4px;
  border: 1px solid var(--color-neutral-3);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-item:hover {
  border-color: rgb(var(--primary-6));
}

.preset-item.active {
  border-color: rgb(var(--primary-6));
  background: var(--color-fill-2);
}

.preset-swatch {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.preset-name {
  font-size: 12px;
  color: var(--color-text-2);
}

.preview-panel {
  border: 1px solid var(--color-neutral-3);
  border-radius: 6px;
  padding: 20px;
  background: var(--color-bg-2);
}

.preview-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.preview-row:last-child {
  margin-bottom: 0;
}
</style>
