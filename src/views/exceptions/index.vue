<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Message } from '@arco-design/web-vue';
import type { TableColumnData } from '@arco-design/web-vue';
import * as api from '@/api/client';
import { exportCsv } from '@/utils/exportCsv';
import type { ExceptionItem } from '@/types';

const loading = ref(false);
const list = ref<ExceptionItem[]>([]);

// ===== 筛选 =====
const dateRange = ref<string[]>([]);
const statusFilter = ref<string>('');
const typeFilter = ref<string>('');

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '待处理', value: 'pending' },
  { label: '整改中', value: 'processing' },
  { label: '已办结', value: 'resolved' },
  { label: '重点管控', value: 'watchlist' },
];

const typeOptions = [
  { label: '全部类型', value: '' },
  { label: '缺勤', value: 'absent' },
  { label: '未签到', value: 'unsigned' },
];

function statusColor(s: string) {
  return s === 'pending'
    ? 'orange'
    : s === 'processing'
      ? 'blue'
      : s === 'resolved'
        ? 'green'
        : s === 'watchlist'
          ? 'red'
          : '';
}
function statusText(s: string) {
  return s === 'pending'
    ? '待处理'
    : s === 'processing'
      ? '整改中'
      : s === 'resolved'
        ? '已办结'
        : s === 'watchlist'
          ? '重点管控'
          : s;
}
function typeColor(t: string) {
  return t === 'absent' ? 'red' : 'orange';
}
function typeText(t: string) {
  return t === 'absent' ? '缺勤' : '未签到';
}

// ===== 统计 =====
const stats = computed(() => ({
  total: list.value.length,
  pending: list.value.filter((e) => e.status === 'pending').length,
  processing: list.value.filter((e) => e.status === 'processing').length,
  resolved: list.value.filter((e) => e.status === 'resolved').length,
}));

// 客户端二次筛选（后端可能已支持，前端兜底）
const filtered = computed(() => {
  const [start, end] = dateRange.value || [];
  return list.value.filter((e) => {
    if (start && end && (e.date < start || e.date > end)) return false;
    if (statusFilter.value && e.status !== statusFilter.value) return false;
    if (typeFilter.value && e.exceptionType !== typeFilter.value) return false;
    return true;
  });
});

async function loadList() {
  loading.value = true;
  try {
    const params: Record<string, string> = {};
    if (statusFilter.value) params.status = statusFilter.value;
    if (typeFilter.value) params.exceptionType = typeFilter.value;
    const [start, end] = dateRange.value || [];
    if (start) params.startDate = start;
    if (end) params.endDate = end;
    list.value = await api.fetchExceptions(params);
  } catch {
    Message.error('加载异常台账失败');
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  loadList();
}
function handleReset() {
  dateRange.value = [];
  statusFilter.value = '';
  typeFilter.value = '';
  loadList();
}

async function handleGenerate() {
  try {
    const res = await api.generateExceptions();
    Message.success(`已生成 ${res.count} 条 ${res.date} 异常台账`);
    await loadList();
  } catch {
    Message.error('生成台账失败');
  }
}

function handleExport() {
  if (!filtered.value.length) {
    Message.warning('没有可导出的数据');
    return;
  }
  exportCsv(
    `异常台账_${new Date().toISOString().slice(0, 10)}.csv`,
    filtered.value.map((e) => ({
      日期: e.date,
      商户: e.merchantName ?? '',
      楼层: e.floor ?? '',
      铺位: e.location ?? '',
      异常类型: typeText(e.exceptionType),
      状态: statusText(e.status),
      处理人: e.handler,
      备注: e.remark,
      创建时间: e.createdAt,
    })),
  );
}

// ===== 整改弹窗 =====
const modalVisible = ref(false);
const submitting = ref(false);
const editing = ref<ExceptionItem | null>(null);
const form = reactive({
  status: 'pending' as ExceptionItem['status'],
  handler: '',
  remark: '',
});

function openRectify(record: ExceptionItem) {
  editing.value = record;
  form.status = record.status;
  form.handler = record.handler;
  form.remark = record.remark;
  modalVisible.value = true;
}

async function handleSubmit() {
  if (!editing.value) return;
  submitting.value = true;
  try {
    await api.updateException(editing.value.id, {
      status: form.status,
      handler: form.handler,
      remark: form.remark,
    });
    Message.success('整改信息已提交');
    modalVisible.value = false;
    await loadList();
  } catch {
    Message.error('提交失败');
  } finally {
    submitting.value = false;
  }
}

// ===== 列定义 =====
const columns: TableColumnData[] = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '商户', dataIndex: 'merchantName', width: 160 },
  { title: '楼层', dataIndex: 'floor', width: 80, align: 'center' },
  { title: '铺位', dataIndex: 'location', width: 110 },
  { title: '异常类型', slotName: 'exceptionType', width: 100, align: 'center' },
  { title: '状态', slotName: 'status', width: 100, align: 'center' },
  { title: '处理人', dataIndex: 'handler', width: 100 },
  { title: '备注', slotName: 'remark' },
  { title: '创建时间', dataIndex: 'createdAt', width: 170 },
  { title: '操作', slotName: 'operations', width: 90, fixed: 'right' },
];

const pagination = {
  pageSize: 15,
  showTotal: true,
  showPageSize: true,
};

onMounted(() => {
  loadList();
});
</script>

<template>
  <div class="page-container">
    <!-- 统计卡 -->
    <a-grid :cols="{ xs: 2, sm: 4 }" :col-gap="12" :row-gap="12" style="margin-bottom: 16px">
      <a-grid-item>
        <a-card>
          <div class="stat-card-value">{{ stats.total }}</div>
          <div class="stat-card-label">异常总数</div>
        </a-card>
      </a-grid-item>
      <a-grid-item>
        <a-card>
          <div class="stat-card-value" style="color: rgb(var(--orange-6))">{{ stats.pending }}</div>
          <div class="stat-card-label">待处理</div>
        </a-card>
      </a-grid-item>
      <a-grid-item>
        <a-card>
          <div class="stat-card-value" style="color: rgb(var(--blue-6))">{{ stats.processing }}</div>
          <div class="stat-card-label">整改中</div>
        </a-card>
      </a-grid-item>
      <a-grid-item>
        <a-card>
          <div class="stat-card-value" style="color: rgb(var(--green-6))">{{ stats.resolved }}</div>
          <div class="stat-card-label">已办结</div>
        </a-card>
      </a-grid-item>
    </a-grid>

    <!-- 主表格 -->
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
            v-model="statusFilter"
            :options="statusOptions"
            style="width: 150px"
            placeholder="状态"
          />
          <a-select
            v-model="typeFilter"
            :options="typeOptions"
            style="width: 150px"
            placeholder="异常类型"
          />
          <a-button type="primary" @click="handleSearch">查询</a-button>
          <a-button @click="handleReset">重置</a-button>
        </a-space>
        <a-space>
          <a-button type="primary" @click="handleGenerate">
            <template #icon><icon-plus /></template>
            一键生成昨日台账
          </a-button>
          <a-button @click="handleExport">
            <template #icon><icon-download /></template>
            导出CSV
          </a-button>
        </a-space>
      </div>

      <a-table
        :data="filtered"
        :columns="columns"
        :pagination="pagination"
        :loading="loading"
        row-key="id"
        size="medium"
        :scroll="{ x: 1300 }"
        style="margin-top: 12px"
      >
        <template #exceptionType="{ record }">
          <a-tag :color="typeColor(record.exceptionType)" size="small">
            {{ typeText(record.exceptionType) }}
          </a-tag>
        </template>
        <template #status="{ record }">
          <a-tag :color="statusColor(record.status)" size="small">{{ statusText(record.status) }}</a-tag>
        </template>
        <template #remark="{ record }">
          <a-tooltip v-if="record.remark" :content="record.remark" position="top">
            <span class="remark-cell">{{ record.remark }}</span>
          </a-tooltip>
          <span v-else class="text-secondary">-</span>
        </template>
        <template #operations="{ record }">
          <a-button type="text" size="small" @click="openRectify(record)">整改</a-button>
        </template>
      </a-table>
    </a-card>

    <!-- 整改弹窗 -->
    <a-modal
      v-model:visible="modalVisible"
      title="异常整改"
      :ok-loading="submitting"
      :mask-closable="false"
      @ok="handleSubmit"
    >
      <a-form :model="form" layout="vertical">
        <a-form-item label="处理状态">
          <a-select v-model="form.status">
            <a-option value="pending">待处理</a-option>
            <a-option value="processing">整改中</a-option>
            <a-option value="resolved">已办结</a-option>
            <a-option value="watchlist">重点管控</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="处理人">
          <a-input v-model="form.handler" placeholder="请输入处理人" allow-clear />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea
            v-model="form.remark"
            placeholder="请输入整改备注"
            :max-length="200"
            show-word-limit
            :auto-size="{ minRows: 3, maxRows: 6 }"
          />
        </a-form-item>
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
  margin-bottom: 16px;
}
.remark-cell {
  display: inline-block;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
  color: var(--color-text-2);
}
.text-secondary {
  color: var(--color-text-4);
}
</style>
