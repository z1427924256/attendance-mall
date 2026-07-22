<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Message } from '@arco-design/web-vue';
import type { TableColumnData, RequestOption, UploadRequest } from '@arco-design/web-vue';
import * as api from '@/api/client';
import { useAdminStore } from '@/store/admin';
import type { ImportLog } from '@/types';

const store = useAdminStore();

// ===== CSV 模板与解析 =====
const TEMPLATE_HEADERS = [
  'name', 'floor', 'location', 'category', 'emoji', 'manager', 'contact', 'area', 'openHours', 'verified',
];

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const filtered = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (!filtered.length) return [];
  const headers = filtered[0].map((h) => h.trim());
  return filtered.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = (r[i] ?? '').trim()));
    return obj;
  });
}

function downloadTemplate() {
  const csv = [
    TEMPLATE_HEADERS.join(','),
    '示例商铺,1F,1F-101,true',
  ].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '商户导入模板.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// 解析后的预览数据
const parsedRows = ref<Record<string, string>[]>([]);
const importResult = ref<{ successCount: number; failCount: number; failReasons: string[] } | null>(null);
const importing = ref(false);
const uploadFileName = ref('');

const previewRows = computed(() => parsedRows.value.slice(0, 10));
const importableCount = computed(() => parsedRows.value.filter((r) => r.name).length);

const previewColumns = computed<TableColumnData[]>(() => {
  if (!parsedRows.value.length) return [];
  return Object.keys(parsedRows.value[0]).map((k) => ({
    title: k,
    dataIndex: k,
    ellipsis: true,
    tooltip: true,
    width: 120,
  }));
});

function customRequest(option: RequestOption): UploadRequest {
  const file = option.fileItem.file;
  if (!file) {
    option.onError();
    return {};
  }
  uploadFileName.value = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || '');
    try {
      parsedRows.value = parseCsv(text);
      importResult.value = null;
      if (!parsedRows.value.length) {
        Message.warning('CSV 文件为空或格式不正确');
      } else {
        Message.success(`已解析 ${parsedRows.value.length} 行数据`);
      }
      option.onSuccess();
    } catch {
      option.onError();
      Message.error('CSV 解析失败');
    }
  };
  reader.onerror = () => {
    option.onError();
    Message.error('文件读取失败');
  };
  reader.readAsText(file, 'utf-8');
  return {};
}

async function handleConfirmImport() {
  if (!parsedRows.value.length) {
    Message.warning('请先上传 CSV 文件');
    return;
  }
  importing.value = true;
  try {
    const merchants = parsedRows.value
      .filter((r) => r.name)
      .map((r) => ({
        name: r.name,
        floor: r.floor,
        location: r.location,
        verified: String(r.verified).toLowerCase() === 'true' || r.verified === '1',
        signedIn: false,
      }));
    const res = await api.bulkImportMerchants(merchants);
    importResult.value = {
      successCount: res.successCount,
      failCount: res.failCount,
      failReasons: res.failReasons || [],
    };
    if (res.successCount > 0) {
      Message.success(`成功导入 ${res.successCount} 条`);
    }
    if (res.failCount > 0) {
      Message.warning(`失败 ${res.failCount} 条，请查看详情`);
    }
    await store.syncFromApi();
    await loadImportLogs();
  } catch {
    Message.error('导入失败');
  } finally {
    importing.value = false;
  }
}

// ===== 批量操作 =====
const selectedKeys = ref<string[]>([]);
const batchModalVisible = ref(false);
const batchSubmitting = ref(false);
const batchForm = reactive({
  field: 'verified' as 'verified' | 'signedIn' | 'floor',
  value: '',
});

const batchFieldOptions = [
  { label: '认证状态 (verified)', value: 'verified' },
  { label: '到岗状态 (signedIn)', value: 'signedIn' },
  { label: '楼层 (floor)', value: 'floor' },
];

const isBooleanField = computed(() => batchForm.field === 'verified' || batchForm.field === 'signedIn');

const merchantColumns: TableColumnData[] = [
  { title: '商户', dataIndex: 'name', width: 180 },
  { title: '楼层', dataIndex: 'floor', width: 80, align: 'center' },
  { title: '铺位', dataIndex: 'location', width: 110 },
  { title: '认证', slotName: 'verified', width: 80, align: 'center' },
];

function openBatchUpdate() {
  if (!selectedKeys.value.length) {
    Message.warning('请先选择商户');
    return;
  }
  batchForm.field = 'verified';
  batchForm.value = '';
  batchModalVisible.value = true;
}

async function submitBatchUpdate() {
  const patch: Record<string, unknown> = {};
  if (isBooleanField.value) {
    patch[batchForm.field] = String(batchForm.value).toLowerCase() === 'true' || batchForm.value === '1';
  } else {
    patch[batchForm.field] = batchForm.value;
  }
  batchSubmitting.value = true;
  try {
    const res = await api.batchUpdateMerchants(selectedKeys.value, patch, 'update');
    Message.success(`已批量更新 ${res.count} 条`);
    batchModalVisible.value = false;
    selectedKeys.value = [];
    await store.syncFromApi();
  } catch {
    Message.error('批量更新失败');
  } finally {
    batchSubmitting.value = false;
  }
}

async function handleBatchDelete() {
  try {
    const res = await api.batchUpdateMerchants(selectedKeys.value, {}, 'delete');
    Message.success(`已批量删除 ${res.count} 条`);
    selectedKeys.value = [];
    await store.syncFromApi();
  } catch {
    Message.error('批量删除失败');
  }
}

// ===== 导入历史日志 =====
const logs = ref<ImportLog[]>([]);
const logsLoading = ref(false);

async function loadImportLogs() {
  logsLoading.value = true;
  try {
    logs.value = await api.fetchImportLogs();
  } catch {
    // 静默处理
  } finally {
    logsLoading.value = false;
  }
}

const logColumns: TableColumnData[] = [
  { title: '类型', dataIndex: 'type', width: 140 },
  { title: '总数', dataIndex: 'total', width: 80, align: 'center' },
  { title: '成功', dataIndex: 'successCount', width: 80, align: 'center' },
  { title: '失败', dataIndex: 'failCount', width: 80, align: 'center' },
  { title: '操作人', dataIndex: 'operator', width: 100 },
  { title: '时间', dataIndex: 'createdAt', width: 170 },
  { title: '失败原因', slotName: 'expand', width: 80, align: 'center' },
];

onMounted(() => {
  if (!store.merchants.length) store.loadFromApi();
  loadImportLogs();
});
</script>

<template>
  <div class="page-container">
    <!-- 上半部分：批量导入商户 -->
    <a-card title="批量导入商户" style="margin-bottom: 16px">
      <div class="toolbar">
        <a-space>
          <a-button @click="downloadTemplate">
            <template #icon><icon-download /></template>
            下载模板
          </a-button>
          <a-upload
            :custom-request="customRequest"
            accept=".csv"
            :limit="1"
            :show-file-list="true"
          >
            <a-button type="primary">
              <template #icon><icon-upload /></template>
              选择 CSV 文件
            </a-button>
          </a-upload>
          <a-button
            type="primary"
            status="success"
            :loading="importing"
            :disabled="!parsedRows.length"
            @click="handleConfirmImport"
          >
            确认导入
          </a-button>
        </a-space>
        <span v-if="parsedRows.length" class="text-secondary">
          共 {{ parsedRows.length }} 行，可导入 {{ importableCount }} 行
        </span>
      </div>

      <!-- 导入结果 -->
      <a-alert
        v-if="importResult"
        :type="importResult.failCount > 0 ? 'warning' : 'success'"
        show-icon
        style="margin-top: 12px"
        :title="`导入完成：成功 ${importResult.successCount} 条 / 失败 ${importResult.failCount} 条`"
      >
        <div v-if="importResult.failReasons.length" style="margin-top: 4px">
          <div class="fail-title">失败原因：</div>
          <ul class="fail-list">
            <li v-for="(r, i) in importResult.failReasons" :key="i">{{ r }}</li>
          </ul>
        </div>
      </a-alert>

      <!-- 预览表格 -->
      <a-table
        v-if="previewColumns.length"
        :data="previewRows"
        :columns="previewColumns"
        :pagination="false"
        row-key="name"
        size="medium"
        :scroll="{ x: 1000 }"
        style="margin-top: 12px"
      />
      <a-empty v-else description="上传 CSV 后在此预览（前 10 行）" style="padding: 32px 0" />
    </a-card>

    <!-- 中间部分：批量操作 -->
    <a-card title="批量操作" style="margin-bottom: 16px">
      <div class="toolbar">
        <a-space>
          <a-button type="primary" :disabled="!selectedKeys.length" @click="openBatchUpdate">
            <template #icon><icon-edit /></template>
            批量修改<span v-if="selectedKeys.length">（{{ selectedKeys.length }}）</span>
          </a-button>
          <a-popconfirm
            :content="`确认删除选中的 ${selectedKeys.length} 个商户？`"
            type="warning"
            :disabled="!selectedKeys.length"
            @ok="handleBatchDelete"
          >
            <a-button status="danger" :disabled="!selectedKeys.length">
              <template #icon><icon-delete /></template>
              批量删除
            </a-button>
          </a-popconfirm>
        </a-space>
        <span class="text-secondary">数据来源：本地商户表（共 {{ store.merchants.length }} 个）</span>
      </div>

      <a-table
        :data="store.merchants"
        :columns="merchantColumns"
        :row-selection="{ type: 'checkbox', showCheckedAll: true }"
        v-model:selectedKeys="selectedKeys"
        :loading="store.loading"
        :pagination="{ pageSize: 10, showTotal: true }"
        row-key="id"
        size="medium"
        :scroll="{ x: 900 }"
        style="margin-top: 12px"
      >
        <template #verified="{ record }">
          <a-tag v-if="record.verified" color="green" size="small">认证</a-tag>
          <a-tag v-else color="gray" size="small">未认证</a-tag>
        </template>
      </a-table>
    </a-card>

    <!-- 下半部分：导入历史日志 -->
    <a-card title="导入历史日志">
      <a-table
        :data="logs"
        :columns="logColumns"
        :loading="logsLoading"
        :pagination="{ pageSize: 10, showTotal: true }"
        :expandable="{ width: 60 }"
        row-key="id"
        size="medium"
        :scroll="{ x: 900 }"
      >
        <template #expand-row="{ record }">
          <div class="fail-expand">
            <div class="fail-title">失败原因（{{ record.failCount }} 条）：</div>
            <ul v-if="record.failReasons && record.failReasons.length" class="fail-list">
              <li v-for="(r, i) in record.failReasons" :key="i">{{ r }}</li>
            </ul>
            <span v-else class="text-secondary">无失败记录</span>
          </div>
        </template>
        <template #expand>
          <span class="text-secondary">点击展开</span>
        </template>
      </a-table>
    </a-card>

    <!-- 批量修改弹窗 -->
    <a-modal
      v-model:visible="batchModalVisible"
      title="批量修改"
      :ok-loading="batchSubmitting"
      :mask-closable="false"
      @ok="submitBatchUpdate"
    >
      <a-form :model="batchForm" layout="vertical">
        <a-form-item label="选择字段">
          <a-select v-model="batchForm.field" :options="batchFieldOptions" />
        </a-form-item>
        <a-form-item v-if="isBooleanField" label="目标值">
          <a-select v-model="batchForm.value">
            <a-option value="true">是 (true)</a-option>
            <a-option value="false">否 (false)</a-option>
          </a-select>
        </a-form-item>
        <a-form-item v-else label="目标值">
          <a-input v-model="batchForm.value" placeholder="请输入目标值" allow-clear />
        </a-form-item>
        <div class="text-secondary">
          将对选中的 {{ selectedKeys.length }} 个商户批量更新该字段。
        </div>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 4px;
}
.text-secondary {
  color: var(--color-text-3);
  font-size: 13px;
}
.fail-title {
  font-weight: 500;
  color: var(--color-text-1);
  margin-bottom: 4px;
}
.fail-list {
  margin: 0;
  padding-left: 20px;
  color: var(--color-text-2);
  max-height: 160px;
  overflow: auto;
}
.fail-expand {
  padding: 4px 0;
}
</style>
