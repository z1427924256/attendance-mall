<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { Message } from '@arco-design/web-vue';
import type { TableColumnData } from '@arco-design/web-vue';
import dayjs from 'dayjs';
import { useAdminStore } from '@/store/admin';
import type { AttendanceRecord, Merchant } from '@/types';

const store = useAdminStore();

onMounted(() => {
  if (!store.merchants.length || !store.records.length) {
    store.loadFromApi();
  }
});

// ===== 筛选条件 =====
const dateRange = ref<string[]>([]);
const merchantFilter = ref<string>('');
const statusFilter = ref<string>('');

const merchantOptions = computed(() => [
  { label: '全部商户', value: '' },
  ...store.merchants.map((m) => ({ label: m.name, value: m.id })),
]);

const statusOptions = [
  { label: '全部', value: '' },
  { label: '已到岗', value: 'signedIn' },
  { label: '缺勤', value: 'absent' },
  { label: '未签到', value: 'unsigned' },
];

// ===== 表格选择 =====
const selectedKeys = ref<string[]>([]);

// ===== 分页 =====
const pagination = reactive({
  current: 1,
  pageSize: 15,
  showTotal: true,
  showPageSize: false,
});

// ===== 数据派生 =====
function merchantInfo(id: string): Merchant | undefined {
  return store.merchants.find((m) => m.id === id);
}
function merchantName(id: string) {
  return merchantInfo(id)?.name ?? '-';
}
function merchantFloor(id: string) {
  return merchantInfo(id)?.floor ?? '-';
}
function statusColor(s: string) {
  return s === 'signedIn' ? 'green' : s === 'absent' ? 'red' : '';
}
function statusText(s: string) {
  return s === 'signedIn' ? '已到岗' : s === 'absent' ? '缺勤' : '未签到';
}
function nowHHmm() {
  return dayjs().format('HH:mm');
}

const filteredRecords = computed<AttendanceRecord[]>(() => {
  const [start, end] = dateRange.value || [];
  return store.records
    .filter((r) => {
      if (start && end && (r.date < start || r.date > end)) return false;
      if (merchantFilter.value && r.merchantId !== merchantFilter.value) return false;
      if (statusFilter.value && r.status !== statusFilter.value) return false;
      return true;
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
});

// 筛选条件变化时重置分页与选中
watch([dateRange, merchantFilter, statusFilter], () => {
  pagination.current = 1;
  selectedKeys.value = [];
});

// ===== 查询 / 重置 =====
function handleSearch() {
  pagination.current = 1;
  selectedKeys.value = [];
}
function handleReset() {
  dateRange.value = [];
  merchantFilter.value = '';
  statusFilter.value = '';
  pagination.current = 1;
  selectedKeys.value = [];
}

// ===== 单行操作 =====
async function handleSign(id: string) {
  try {
    await store.setRecordStatus(id, 'signedIn', 'admin', nowHHmm());
    Message.success('已补签');
  } catch {
    Message.error('补签失败');
  }
}
async function handleMarkAbsent(id: string) {
  try {
    await store.setRecordStatus(id, 'absent', 'admin');
    Message.success('已标记缺勤');
  } catch {
    Message.error('操作失败');
  }
}
async function handleResetStatus(id: string) {
  try {
    await store.setRecordStatus(id, 'unsigned', 'admin', '');
    Message.success('已重置为未签到');
  } catch {
    Message.error('操作失败');
  }
}

// ===== 批量补签 =====
async function handleBatchSign() {
  if (!selectedKeys.value.length) return;
  try {
    const count = selectedKeys.value.length;
    await store.batchSign(selectedKeys.value, 'admin');
    Message.success(`已为 ${count} 条记录补签`);
    selectedKeys.value = [];
  } catch {
    Message.error('批量补签失败');
  }
}

// ===== 编辑备注弹窗 =====
const remarkModalVisible = ref(false);
const remarkTarget = ref<AttendanceRecord | null>(null);
const remarkForm = reactive({ remark: '' });

function openRemark(record: AttendanceRecord) {
  remarkTarget.value = record;
  remarkForm.remark = record.remark ?? '';
  remarkModalVisible.value = true;
}
async function handleRemarkSubmit(): Promise<boolean> {
  if (!remarkTarget.value) return false;
  try {
    await store.addRemark(remarkTarget.value.id, remarkForm.remark, 'admin');
    Message.success('备注已保存');
    return true;
  } catch {
    Message.error('保存失败');
    return false;
  }
}

// ===== 列定义 =====
const columns: TableColumnData[] = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '商户', slotName: 'merchant' },
  { title: '楼层', slotName: 'floor', width: 80 },
  { title: '状态', slotName: 'status', width: 100 },
  { title: '签到时间', dataIndex: 'signedAt', width: 100 },
  { title: '操作人', dataIndex: 'operator', width: 100 },
  { title: '备注', slotName: 'remark' },
  { title: '操作', slotName: 'operation', width: 240, fixed: 'right' },
];
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
            v-model="merchantFilter"
            :options="merchantOptions"
            style="width: 180px"
            placeholder="商户"
            allow-clear
          />
          <a-select
            v-model="statusFilter"
            :options="statusOptions"
            style="width: 140px"
            placeholder="状态"
          />
          <a-button type="primary" @click="handleSearch">查询</a-button>
          <a-button @click="handleReset">重置</a-button>
        </a-space>
        <a-popconfirm content="确认为选中的记录批量补签？" @ok="handleBatchSign">
          <a-button type="primary" :disabled="!selectedKeys.length">
            批量补签<span v-if="selectedKeys.length">（{{ selectedKeys.length }}）</span>
          </a-button>
        </a-popconfirm>
      </div>

      <a-table
        :data="filteredRecords"
        :columns="columns"
        :pagination="pagination"
        :loading="store.loading"
        :row-selection="{ type: 'checkbox', showCheckedAll: true }"
        v-model:selectedKeys="selectedKeys"
        row-key="id"
        size="medium"
        :scroll="{ x: 1200 }"
      >
        <template #merchant="{ record }">
          {{ merchantName(record.merchantId) }}
        </template>
        <template #floor="{ record }">
          {{ merchantFloor(record.merchantId) }}
        </template>
        <template #status="{ record }">
          <a-tag :color="statusColor(record.status)">{{ statusText(record.status) }}</a-tag>
        </template>
        <template #remark="{ record }">
          <a-tooltip v-if="record.remark" :content="record.remark" position="top">
            <span class="remark-cell">{{ record.remark }}</span>
          </a-tooltip>
          <span v-else class="text-secondary">-</span>
        </template>
        <template #operation="{ record }">
          <a-space :size="4">
            <a-button type="text" size="small" @click="handleSign(record.id)">补签</a-button>
            <a-button type="text" size="small" status="danger" @click="handleMarkAbsent(record.id)">标缺勤</a-button>
            <a-popconfirm content="确认重置该记录为未签到？" @ok="handleResetStatus(record.id)">
              <a-button type="text" size="small">重置</a-button>
            </a-popconfirm>
            <a-button type="text" size="small" @click="openRemark(record)">编辑备注</a-button>
          </a-space>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:visible="remarkModalVisible"
      title="编辑备注"
      :on-before-ok="handleRemarkSubmit"
    >
      <a-form :model="remarkForm" layout="vertical">
        <a-form-item label="备注内容">
          <a-textarea
            v-model="remarkForm.remark"
            placeholder="请输入备注内容"
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
