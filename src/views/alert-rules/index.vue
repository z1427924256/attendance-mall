<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Message } from '@arco-design/web-vue';
import * as api from '@/api/client';
import type { AlertRule, AlertRecord } from '@/types';

const rules = ref<AlertRule[]>([]);
const records = ref<AlertRecord[]>([]);
const loadingRules = ref(false);
const loadingRecords = ref(false);

const modalVisible = ref(false);
const submitting = ref(false);
const editing = ref<AlertRule | null>(null);
const formRef = ref();

const conditionOptions = [
  { label: '单日缺勤商户数', value: 'daily_absent_count' },
  { label: '单商户月度缺勤次数', value: 'merchant_monthly_absent' },
] as const;

function conditionLabel(v: string) {
  return conditionOptions.find((o) => o.value === v)?.label ?? v;
}

const createForm = () => ({
  name: '',
  conditionType: 'daily_absent_count' as AlertRule['conditionType'],
  threshold: 1,
  enabled: true,
});

const form = reactive(createForm());

const formRules = {
  name: [{ required: true, message: '请输入规则名称' }],
};

async function loadRules() {
  loadingRules.value = true;
  try {
    rules.value = await api.fetchAlertRules();
  } catch {
    Message.error('加载预警规则失败');
  } finally {
    loadingRules.value = false;
  }
}

async function loadRecords() {
  loadingRecords.value = true;
  try {
    records.value = await api.fetchAlertRecords();
  } catch {
    Message.error('加载预警记录失败');
  } finally {
    loadingRecords.value = false;
  }
}

onMounted(() => {
  loadRules();
  loadRecords();
});

function openAdd() {
  editing.value = null;
  Object.assign(form, createForm());
  modalVisible.value = true;
}

function openEdit(record: AlertRule) {
  editing.value = record;
  Object.assign(form, {
    name: record.name,
    conditionType: record.conditionType,
    threshold: record.threshold,
    enabled: record.enabled,
  });
  modalVisible.value = true;
}

async function handleSubmit() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  submitting.value = true;
  try {
    const payload = { ...form };
    if (editing.value) {
      await api.updateAlertRule(editing.value.id, payload);
      Message.success('规则更新成功');
    } else {
      await api.createAlertRule(payload);
      Message.success('规则新增成功');
    }
    modalVisible.value = false;
    await loadRules();
  } catch {
    Message.error(editing.value ? '规则更新失败' : '规则新增失败');
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(record: AlertRule) {
  try {
    await api.deleteAlertRule(record.id);
    Message.success('规则删除成功');
    await loadRules();
  } catch {
    Message.error('规则删除失败');
  }
}

async function handleToggle(record: AlertRule, value: string | number | boolean) {
  const enabled = !!value;
  const prev = record.enabled;
  record.enabled = enabled;
  try {
    await api.updateAlertRule(record.id, { enabled });
    Message.success(enabled ? '规则已启用' : '规则已停用');
  } catch {
    record.enabled = prev;
    Message.error('状态切换失败');
  }
}

const recordStatusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待处理', color: 'orange' },
  triggered: { text: '已触发', color: 'red' },
  resolved: { text: '已处理', color: 'green' },
  notified: { text: '已通知', color: 'blue' },
};

const ruleColumns = [
  { title: '规则名称', dataIndex: 'name' },
  { title: '条件类型', slotName: 'conditionType', width: 200 },
  { title: '阈值', dataIndex: 'threshold', align: 'center' as const, width: 100 },
  { title: '启用状态', slotName: 'enabled', align: 'center' as const, width: 110 },
  { title: '创建时间', dataIndex: 'createdAt', width: 180 },
  { title: '操作', slotName: 'operations', width: 140, fixed: 'right' as const },
];

const recordColumns = [
  { title: '规则名称', slotName: 'ruleName', width: 160 },
  { title: '内容', dataIndex: 'content' },
  { title: '状态', slotName: 'status', align: 'center' as const, width: 110 },
  { title: '触发时间', dataIndex: 'createdAt', width: 180 },
];
</script>

<template>
  <div class="page-container">
    <!-- 预警规则管理 -->
    <a-card title="预警规则" style="margin-bottom: 16px">
      <div class="toolbar">
        <a-button type="primary" @click="openAdd">
          <template #icon><icon-plus /></template>
          新增规则
        </a-button>
      </div>
      <a-table
        :data="rules"
        :columns="ruleColumns"
        :loading="loadingRules"
        row-key="id"
        size="medium"
        style="margin-top: 12px"
      >
        <template #conditionType="{ record }">{{ conditionLabel(record.conditionType) }}</template>
        <template #enabled="{ record }">
          <a-switch
            :model-value="record.enabled"
            @change="(v: string | number | boolean) => handleToggle(record, v)"
          />
        </template>
        <template #operations="{ record }">
          <a-space>
            <a-button type="text" size="small" @click="openEdit(record)">编辑</a-button>
            <a-popconfirm content="确认删除该规则吗？" type="warning" @ok="handleDelete(record)">
              <a-button type="text" status="danger" size="small">删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </a-table>
    </a-card>

    <!-- 预警记录 -->
    <a-card title="预警记录">
      <a-table
        :data="records"
        :columns="recordColumns"
        :loading="loadingRecords"
        row-key="id"
        size="medium"
      >
        <template #ruleName="{ record }">{{ record.ruleName || record.ruleId }}</template>
        <template #status="{ record }">
          <a-tag
            :color="recordStatusMap[record.status]?.color || 'gray'"
            size="small"
          >
            {{ recordStatusMap[record.status]?.text || record.status }}
          </a-tag>
        </template>
      </a-table>
    </a-card>

    <!-- 新增/编辑规则弹窗 -->
    <a-modal
      v-model:visible="modalVisible"
      :title="editing ? '编辑规则' : '新增规则'"
      :ok-loading="submitting"
      :mask-closable="false"
      @ok="handleSubmit"
    >
      <a-form ref="formRef" :model="form" :rules="formRules" layout="vertical">
        <a-form-item field="name" label="规则名称" required>
          <a-input v-model="form.name" placeholder="请输入规则名称" allow-clear />
        </a-form-item>
        <a-form-item field="conditionType" label="条件类型">
          <a-select v-model="form.conditionType">
            <a-option
              v-for="o in conditionOptions"
              :key="o.value"
              :value="o.value"
            >{{ o.label }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="threshold" label="阈值">
          <a-input-number
            v-model="form.threshold"
            :min="0"
            :step="1"
            :precision="0"
            style="width: 100%"
            placeholder="请输入阈值"
          />
        </a-form-item>
        <a-form-item field="enabled" label="启用">
          <a-switch v-model="form.enabled" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
