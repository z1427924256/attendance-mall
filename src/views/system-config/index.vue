<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Message } from '@arco-design/web-vue';
import type { FileItem } from '@arco-design/web-vue';
import * as api from '@/api/client';
import { uploadBackground } from '@/api/client';

interface ConfigForm {
  mallName: string;
  logoUrl: string;
  reportHeader: string;
  exportWatermark: string;
  mallAddress: string;
  servicePhone: string;
  mallHours: string;
  copyright: string;
  icp: string;
  checkinRadius: number;
  locationEnabled: boolean;
  homeBgUrl: string;
}

const createForm = (): ConfigForm => ({
  mallName: '',
  logoUrl: '',
  reportHeader: '',
  exportWatermark: '',
  mallAddress: '',
  servicePhone: '',
  mallHours: '',
  copyright: '',
  icp: '',
  checkinRadius: 0,
  locationEnabled: false,
  homeBgUrl: '',
});

const form = reactive<ConfigForm>(createForm());
const formRef = ref();
const saving = ref(false);
const loading = ref(false);
const uploadingBg = ref(false);

function beforeUpload(file: File): boolean {
  if (!file.type.startsWith('image/')) {
    Message.error('请选择图片文件');
    return false;
  }
  if (file.size > 5 * 1024 * 1024) {
    Message.error('图片不能超过 5MB');
    return false;
  }
  return true;
}

async function handleBgChange(fileItemList: FileItem[], fileItem: FileItem) {
  const f = fileItem.file;
  if (!f) return;
  if (!beforeUpload(f)) return;
  uploadingBg.value = true;
  try {
    const { url } = await uploadBackground(f);
    form.homeBgUrl = url;
    Message.success('背景图上传成功');
  } catch (e) {
    Message.error('背景图上传失败：' + ((e as Error).message || ''));
  } finally {
    uploadingBg.value = false;
  }
}

function removeBg() {
  form.homeBgUrl = '';
}

// 兼容后端 camelCase / snake_case 两种 key 形式
function pick(cfg: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (cfg[k] !== undefined && cfg[k] !== null) return String(cfg[k]);
  }
  return '';
}

async function loadConfig() {
  loading.value = true;
  try {
    const cfg = await api.fetchSystemConfig();
    form.mallName = pick(cfg, 'mallName', 'mall_name');
    form.logoUrl = pick(cfg, 'logoUrl', 'logo_url');
    form.reportHeader = pick(cfg, 'reportHeader', 'report_header');
    form.exportWatermark = pick(cfg, 'exportWatermark', 'export_watermark');
    form.mallAddress = pick(cfg, 'mallAddress', 'mall_address');
    form.servicePhone = pick(cfg, 'servicePhone', 'service_phone');
    form.mallHours = pick(cfg, 'mallHours', 'mall_hours');
    form.copyright = pick(cfg, 'copyright');
    form.icp = pick(cfg, 'icp');
    const radius = pick(cfg, 'checkinRadius', 'checkin_radius');
    form.checkinRadius = radius ? Number(radius) || 0 : 0;
    const loc = pick(cfg, 'locationEnabled', 'location_enabled');
    form.locationEnabled = loc === '1' || loc === 'true';
    form.homeBgUrl = pick(cfg, 'homeBgUrl', 'home_bg_url');
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
      mallAddress: form.mallAddress,
      servicePhone: form.servicePhone,
      mallHours: form.mallHours,
      copyright: form.copyright,
      icp: form.icp,
      checkinRadius: String(form.checkinRadius ?? 0),
      locationEnabled: form.locationEnabled ? '1' : '0',
      homeBgUrl: form.homeBgUrl,
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
    <a-card title="主页背景图" style="margin-bottom: 16px">
      <div class="bg-upload-row">
        <div class="bg-preview">
          <img v-if="form.homeBgUrl" :src="form.homeBgUrl" alt="背景图" />
          <div v-else class="bg-empty">未设置背景图</div>
        </div>
        <div class="bg-actions">
          <a-upload
            :auto-upload="false"
            :show-file-list="false"
            :show-remove-button="false"
            :custom-request="() => {}"
            accept="image/*"
            @change="handleBgChange"
          >
            <template #upload-button>
              <a-button :loading="uploadingBg" type="primary">
                <template #icon><icon-upload /></template>
                上传背景图
              </a-button>
            </template>
          </a-upload>
          <a-button v-if="form.homeBgUrl" status="danger" type="text" @click="removeBg">
            移除背景
          </a-button>
          <span class="hint">建议尺寸 750×1624，≤5MB。上传后请点击下方"保存配置"。</span>
        </div>
      </div>
    </a-card>

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

      <a-form ref="formRef" :model="form" layout="vertical">
        <a-grid :cols="2" :col-gap="16" :row-gap="0">
          <a-grid-item>
            <a-form-item field="mallName" label="商场名称" :rules="[{required:true,message:'请输入商场名称'}]">
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
            <a-form-item field="mallAddress" label="商场地址">
              <a-input v-model="form.mallAddress" placeholder="请输入商场地址" allow-clear />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="servicePhone" label="客服电话">
              <a-input v-model="form.servicePhone" placeholder="请输入客服电话" allow-clear />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="mallHours" label="营业时间">
              <a-input v-model="form.mallHours" placeholder="如 10:00-22:00" allow-clear />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="checkinRadius" label="签到半径（米）">
              <a-input-number
                v-model="form.checkinRadius"
                :min="0"
                :step="1"
                :precision="0"
                style="width: 100%"
                placeholder="单位米"
              />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="copyright" label="版权信息">
              <a-input v-model="form.copyright" placeholder="请输入版权信息" allow-clear />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="icp" label="ICP备案号">
              <a-input v-model="form.icp" placeholder="请输入 ICP 备案号" allow-clear />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="locationEnabled" label="定位开关">
              <a-switch v-model="form.locationEnabled" />
              <span class="hint">开启后签到将校验商户位置</span>
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

.bg-upload-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.bg-preview {
  width: 120px;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-fill-2);
  flex-shrink: 0;
  border: 1px solid var(--color-border-2);
}
.bg-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.bg-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--color-text-3);
}
.bg-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
.bg-actions .hint {
  margin-left: 0;
}
</style>
