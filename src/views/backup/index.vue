<script setup lang="ts">
import { ref } from 'vue';
import { Message } from '@arco-design/web-vue';
import type { RequestOption, UploadRequest } from '@arco-design/web-vue';
import * as api from '@/api/client';
import { useAdminStore } from '@/store/admin';

const store = useAdminStore();

const lastBackupTime = ref<string>(localStorage.getItem('last_backup_time') || '');
const exporting = ref(false);

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function handleExport(format: 'json' | 'sql') {
  exporting.value = true;
  try {
    const blob = await api.exportBackup(format);
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    download(blob, `backup-${ts}.${format}`);
    lastBackupTime.value = new Date().toLocaleString();
    localStorage.setItem('last_backup_time', lastBackupTime.value);
    Message.success(`已导出 ${format.toUpperCase()} 备份`);
  } catch {
    Message.error('导出失败');
  } finally {
    exporting.value = false;
  }
}

// ===== 恢复 =====
const restoreData = ref<Record<string, unknown[]> | null>(null);
const restoreFileName = ref('');
const restoring = ref(false);
const tableCounts = ref<{ name: string; count: number }[]>([]);

function customRequest(option: RequestOption): UploadRequest {
  const file = option.fileItem.file;
  if (!file) {
    option.onError();
    return {};
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || '{}'));
      restoreData.value = data;
      restoreFileName.value = file.name;
      tableCounts.value = Object.keys(data).map((k) => ({
        name: k,
        count: Array.isArray(data[k]) ? data[k].length : 0,
      }));
      option.onSuccess();
      Message.success('文件解析成功，请确认后恢复');
    } catch {
      option.onError();
      Message.error('JSON 文件解析失败');
    }
  };
  reader.onerror = () => {
    option.onError();
    Message.error('文件读取失败');
  };
  reader.readAsText(file, 'utf-8');
  return {};
}

async function handleRestore() {
  if (!restoreData.value) return;
  restoring.value = true;
  try {
    await api.restoreBackup(restoreData.value);
    Message.success('数据恢复成功');
    await store.loadFromApi();
    clearRestore();
  } catch {
    Message.error('恢复失败');
  } finally {
    restoring.value = false;
  }
}

function clearRestore() {
  restoreData.value = null;
  restoreFileName.value = '';
  tableCounts.value = [];
}
</script>

<template>
  <div class="page-container">
    <!-- 上半部分：导出备份 -->
    <a-card title="导出备份" style="margin-bottom: 16px">
      <div class="toolbar">
        <a-space>
          <a-button type="primary" :loading="exporting" @click="handleExport('json')">
            <template #icon><icon-download /></template>
            导出 JSON
          </a-button>
          <a-button :loading="exporting" @click="handleExport('sql')">
            <template #icon><icon-storage /></template>
            导出 SQL
          </a-button>
        </a-space>
        <span class="text-secondary">
          上次备份时间：{{ lastBackupTime || '暂无记录' }}
        </span>
      </div>
      <div class="tip text-secondary">
        导出当前系统的全量数据。JSON 格式可用于恢复，SQL 格式可用于数据库迁移。
      </div>
    </a-card>

    <!-- 下半部分：恢复数据 -->
    <a-card title="恢复数据">
      <a-alert type="warning" show-icon style="margin-bottom: 16px">
        恢复操作将覆盖现有数据，请谨慎操作！建议在恢复前先导出当前数据作为备份。
      </a-alert>

      <div class="toolbar">
        <a-upload
          :custom-request="customRequest"
          accept=".json"
          :limit="1"
          :show-file-list="true"
        >
          <a-button type="primary">
            <template #icon><icon-upload /></template>
            选择 JSON 备份文件
          </a-button>
        </a-upload>
        <a-button v-if="restoreData" @click="clearRestore">清除选择</a-button>
      </div>

      <!-- 预览 -->
      <div v-if="restoreData" style="margin-top: 16px">
        <div class="card-section-header">备份文件预览：{{ restoreFileName }}</div>
        <a-descriptions
          :column="2"
          bordered
          :data="tableCounts.map((t) => ({ label: t.name, value: `${t.count} 条` }))"
        />
        <div style="margin-top: 20px">
          <a-popconfirm
            content="确认恢复？该操作将覆盖现有数据，不可撤销！"
            type="warning"
            ok-text="确认恢复"
            cancel-text="取消"
            @ok="handleRestore"
          >
            <a-button type="primary" status="danger" :loading="restoring">
              <template #icon><icon-refresh /></template>
              确认恢复
            </a-button>
          </a-popconfirm>
        </div>
      </div>
      <a-empty v-else description="请上传 JSON 备份文件进行预览" style="padding: 32px 0" />
    </a-card>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.text-secondary {
  color: var(--color-text-3);
  font-size: 13px;
}
.tip {
  margin-top: 12px;
  line-height: 1.6;
}
</style>
