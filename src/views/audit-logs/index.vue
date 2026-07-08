<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Message } from '@arco-design/web-vue';
import type { TableColumnData } from '@arco-design/web-vue';
import * as api from '@/api/client';
import { exportCsv } from '@/utils/exportCsv';
import type { AuditLog } from '@/types';

const loading = ref(false);
const list = ref<AuditLog[]>([]);

// ===== 筛选 =====
const dateRange = ref<string[]>([]);
const moduleFilter = ref<string>('');
const actionFilter = ref<string>('');
const userFilter = ref<string>('');

const moduleOptions = [
  { label: '全部模块', value: '' },
  { label: '商户管理', value: 'merchants' },
  { label: '考勤记录', value: 'records' },
  { label: '点名规则', value: 'rules' },
  { label: '公告', value: 'announcements' },
  { label: '异常台账', value: 'exceptions' },
  { label: '备份恢复', value: 'backup' },
];

const actionOptions = [
  { label: '全部操作', value: '' },
  { label: '新增', value: 'create' },
  { label: '更新', value: 'update' },
  { label: '删除', value: 'delete' },
];

function actionColor(a: string) {
  return a === 'create' ? 'green' : a === 'update' ? 'blue' : a === 'delete' ? 'red' : '';
}
function actionText(a: string) {
  return a === 'create' ? '新增' : a === 'update' ? '更新' : a === 'delete' ? '删除' : a;
}

function prettyJson(s: string) {
  if (!s) return '';
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

function detailSummary(record: AuditLog) {
  const after = prettyJson(record.afterData);
  const before = prettyJson(record.beforeData);
  return after || before || '';
}

// ===== 分页（服务端） =====
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showTotal: true,
  showPageSize: true,
});

async function loadList() {
  loading.value = true;
  try {
    const [start, end] = dateRange.value || [];
    const res = await api.fetchAuditLogs({
      startDate: start,
      endDate: end,
      module: moduleFilter.value || undefined,
      action: actionFilter.value || undefined,
      user: userFilter.value || undefined,
      page: pagination.current,
      pageSize: pagination.pageSize,
    });
    list.value = res.list || [];
    pagination.total = res.total || 0;
  } catch {
    Message.error('加载审计日志失败');
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.current = 1;
  loadList();
}
function handleReset() {
  dateRange.value = [];
  moduleFilter.value = '';
  actionFilter.value = '';
  userFilter.value = '';
  pagination.current = 1;
  loadList();
}
function handlePageChange(page: number) {
  pagination.current = page;
  loadList();
}
function handlePageSizeChange(size: number) {
  pagination.pageSize = size;
  pagination.current = 1;
  loadList();
}

function handleExport() {
  if (!list.value.length) {
    Message.warning('没有可导出的数据');
    return;
  }
  exportCsv(
    `审计日志_${new Date().toISOString().slice(0, 10)}.csv`,
    list.value.map((l) => ({
      时间: l.createdAt,
      用户: l.user,
      操作: actionText(l.action),
      模块: l.module,
      目标ID: l.targetId,
      IP: l.ip,
      详情: detailSummary(l),
    })),
  );
  Message.success('已导出当前页数据');
}

// ===== 列定义 =====
const columns: TableColumnData[] = [
  { title: '时间', dataIndex: 'createdAt', width: 170 },
  { title: '用户', dataIndex: 'user', width: 120 },
  { title: '操作', slotName: 'action', width: 90, align: 'center' },
  { title: '模块', dataIndex: 'module', width: 130 },
  { title: '目标ID', dataIndex: 'targetId', width: 180 },
  { title: 'IP', dataIndex: 'ip', width: 140 },
  { title: '详情', slotName: 'detail' },
];

onMounted(() => {
  loadList();
});
</script>

<template>
  <div class="page-container">
    <a-card>
      <div class="toolbar">
        <a-space wrap :size="8">
          <a-range-picker
            v-model="dateRange"
            value-format="YYYY-MM-DD"
            format="YYYY-MM-DD"
            style="width: 280px"
            :placeholder="['开始日期', '结束日期']"
          />
          <a-select
            v-model="moduleFilter"
            :options="moduleOptions"
            style="width: 160px"
            placeholder="模块"
          />
          <a-select
            v-model="actionFilter"
            :options="actionOptions"
            style="width: 130px"
            placeholder="操作"
          />
          <a-input
            v-model="userFilter"
            placeholder="用户名"
            style="width: 160px"
            allow-clear
          />
          <a-button type="primary" @click="handleSearch">查询</a-button>
          <a-button @click="handleReset">重置</a-button>
        </a-space>
        <a-button @click="handleExport">
          <template #icon><icon-download /></template>
          导出CSV
        </a-button>
      </div>

      <a-table
        :data="list"
        :columns="columns"
        :pagination="pagination"
        :loading="loading"
        :expandable="{ width: 60 }"
        row-key="id"
        size="medium"
        :scroll="{ x: 1200 }"
        style="margin-top: 12px"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #action="{ record }">
          <a-tag :color="actionColor(record.action)" size="small">{{ actionText(record.action) }}</a-tag>
        </template>
        <template #detail="{ record }">
          <a-tooltip v-if="detailSummary(record)" :content="detailSummary(record)" position="tl">
            <span class="detail-cell">{{ detailSummary(record) }}</span>
          </a-tooltip>
          <span v-else class="text-secondary">-</span>
        </template>
        <template #expand-row="{ record }">
          <div class="detail-block">
            <div class="detail-section">
              <div class="detail-title">变更前 (beforeData)</div>
              <pre class="json-pre">{{ prettyJson(record.beforeData) || '无' }}</pre>
            </div>
            <div class="detail-section">
              <div class="detail-title">变更后 (afterData)</div>
              <pre class="json-pre">{{ prettyJson(record.afterData) || '无' }}</pre>
            </div>
          </div>
        </template>
      </a-table>
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
  margin-bottom: 16px;
}
.detail-cell {
  display: inline-block;
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
  color: var(--color-text-2);
}
.text-secondary {
  color: var(--color-text-4);
}
.detail-block {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}
.detail-section {
  flex: 1;
  min-width: 280px;
}
.detail-title {
  font-weight: 500;
  color: var(--color-text-1);
  margin-bottom: 6px;
}
.json-pre {
  margin: 0;
  padding: 10px;
  background: var(--color-fill-2);
  border-radius: 4px;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Mono', 'Roboto Mono', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-text-2);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 320px;
  overflow: auto;
}
</style>
