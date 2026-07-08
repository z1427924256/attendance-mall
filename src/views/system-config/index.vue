<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Message } from '@arco-design/web-vue';
import * as api from '@/api/client';

interface ConfigForm {
  mallName: string;
  logoUrl: string;
  reportHeader: string;
  exportWatermark: string;
  emailNotification: boolean;
  themeColor: string;
}

const createForm = (): ConfigForm => ({
  mallName: '',
  logoUrl: '',
  reportHeader: '',
  exportWatermark: '',
  emailNotification: false,
  themeColor: '#165DFF',
});

const form = reactive<ConfigForm>(createForm());
const saving = ref(false);
const loading = ref(false);

async function loadConfig() {
  loading.value = true;
  try {
    const cfg = await api.fetchSystemConfig();
    form.mallName = (cfg.mallName as string) ?? (cfg.mall_name as string) ?? '';
    form.logoUrl = (cfg.logoUrl as string) ?? (cfg.logo_url as string) ?? '';
    form.reportHeader = (cfg.reportHeader as string) ?? (cfg.report_header as string) ?? '';
    form.exportWatermark =
      (cfg.exportWatermark as string) ?? (cfg.export_watermark as string) ?? '';
    const en =
      (cfg.emailNotification as string) ?? (cfg.email_notification as string) ?? '0';
    form.emailNotification = en === '1' || en === 'true';
    form.themeColor = (cfg.themeColor as string) ?? (cfg.theme_color as string) ?? '#165DFF';
  } catch {
    Message.error('加载系统配置失败');
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  saving.value = true;
  try {
    await api.updateSystemConfig({
      mallName: form.mallName,
      logoUrl: form.logoUrl,
      reportHeader: form.reportHeader,
      exportWatermark: form.exportWatermark,
      emailNotification: form.emailNotification ? '1' : '0',
      themeColor: form.themeColor,
    });
    Message.success('配置保存成功');
  } catch {
    Message.error('配置保存失败');
  } finally {
    saving.value = false;
  }
}

onMounted(loadConfig);
</script>

<template>
  <div class="page-container">
    <a-card title="系统配置">
      <div class="toolbar">
        <span class="section-title">基础配置</span>
        <a-space>
          <a-button :loading="loading" @click="loadConfig">
            <template #icon><icon-refresh /></template>
            重新加载
          </a-button>
          <a-button type="primary" :loading="saving" @click="handleSave">
            <template #icon><icon-save /></template>
            保存配置
          </a-button>
        </a-space>
      </div>

      <a-form :model="form" layout="vertical">
        <a-grid :cols="2" :col-gap="16" :row-gap="0">
          <a-grid-item>
            <a-form-item field="mallName" label="商场名称">
              <a-input v-model="form.mallName" placeholder="请输入商场名称" allow-clear />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="logoUrl" label="LOGO URL">
              <a-input v-model="form.logoUrl" placeholder="请输入 LOGO 图片地址" allow-clear />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="reportHeader" label="报表页眉">
              <a-input v-model="form.reportHeader" placeholder="请输入报表页眉" allow-clear />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="exportWatermark" label="导出水印">
              <a-input v-model="form.exportWatermark" placeholder="请输入导出水印文字" allow-clear />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="emailNotification" label="邮件推送">
              <a-switch v-model="form.emailNotification" />
              <span class="hint">开启后报表将自动邮件推送</span>
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="themeColor" label="主题色">
              <a-space>
                <input
                  v-model="form.themeColor"
                  type="color"
                  class="color-input"
                />
                <a-input v-model="form.themeColor" style="width: 130px" />
              </a-space>
            </a-form-item>
          </a-grid-item>
        </a-grid>
      </a-form>
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

.hint {
  margin-left: 12px;
  font-size: 12px;
  color: var(--color-text-3);
}

.color-input {
  width: 36px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--color-neutral-3);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}
</style>
