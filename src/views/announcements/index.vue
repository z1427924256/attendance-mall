<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Message } from '@arco-design/web-vue';
import * as api from '@/api/client';
import type { Announcement, StructureItem } from '@/types';

const list = ref<Announcement[]>([]);
const loading = ref(false);
const modalVisible = ref(false);
const submitting = ref(false);
const editing = ref<Announcement | null>(null);
const formRef = ref();

const floorList = ref<StructureItem[]>([]);

function itemName(items: StructureItem[], id: string) {
  return items.find((x) => x.id === id)?.name ?? id;
}

const createForm = () => ({
  title: '',
  content: '',
  type: 'global' as Announcement['type'],
  scope: [] as string[],
  pinned: false,
  forcePopup: false,
  expireAt: '',
});

const form = reactive(createForm());

const formRules = {
  title: [{ required: true, message: '请输入公告标题' }],
};

async function loadList() {
  loading.value = true;
  try {
    list.value = await api.fetchAnnouncements();
  } catch {
    Message.error('加载公告列表失败');
  } finally {
    loading.value = false;
  }
}

async function loadOptions() {
  try {
    floorList.value = await api.fetchFloors();
  } catch {
    floorList.value = [];
  }
}

onMounted(() => {
  loadList();
  loadOptions();
});

function openAdd() {
  editing.value = null;
  Object.assign(form, createForm());
  modalVisible.value = true;
}

function openEdit(record: Announcement) {
  editing.value = record;
  Object.assign(form, {
    title: record.title,
    content: record.content,
    type: record.type,
    scope: Array.isArray(record.scope)
      ? [...record.scope]
      : record.scope
        ? [record.scope]
        : [],
    pinned: record.pinned,
    forcePopup: record.forcePopup,
    expireAt: record.expireAt,
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
    const payload: Partial<Announcement> = {
      title: form.title,
      content: form.content,
      type: form.type,
      pinned: form.pinned,
      forcePopup: form.forcePopup,
      expireAt: form.expireAt,
      scope: form.type === 'targeted' ? form.scope : '',
    };
    if (editing.value) {
      await api.updateAnnouncement(editing.value.id, payload);
      Message.success('公告更新成功');
    } else {
      await api.createAnnouncement(payload);
      Message.success('公告新增成功');
    }
    modalVisible.value = false;
    await loadList();
  } catch {
    Message.error(editing.value ? '公告更新失败' : '公告新增失败');
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(record: Announcement) {
  try {
    await api.deleteAnnouncement(record.id);
    Message.success('公告删除成功');
    await loadList();
  } catch {
    Message.error('公告删除失败');
  }
}

function scopeText(record: Announcement) {
  if (record.type === 'global') return '全部';
  const ids = Array.isArray(record.scope)
    ? record.scope
    : record.scope
      ? [record.scope]
      : [];
  if (!ids.length) return '-';
  return ids.map((id) => itemName(floorList.value, id)).join('、');
}

const columns = [
  { title: '标题', dataIndex: 'title', width: 200 },
  { title: '类型', slotName: 'type', align: 'center' as const, width: 100 },
  { title: '推送范围', slotName: 'scope', width: 180 },
  { title: '置顶', slotName: 'pinned', align: 'center' as const, width: 80 },
  { title: '强制弹窗', slotName: 'forcePopup', align: 'center' as const, width: 100 },
  { title: '到期时间', dataIndex: 'expireAt', width: 130 },
  { title: '创建时间', dataIndex: 'createdAt', width: 180 },
  { title: '操作', slotName: 'operations', width: 140, fixed: 'right' as const },
];

const pagination = { pageSize: 10, showTotal: true };
</script>

<template>
  <div class="page-container">
    <a-card title="公告管理">
      <div class="toolbar">
        <a-button type="primary" @click="openAdd">
          <template #icon><icon-plus /></template>
          新增公告
        </a-button>
      </div>
      <a-table
        :data="list"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="medium"
        style="margin-top: 12px"
        :scroll="{ x: 1100 }"
      >
        <template #type="{ record }">
          <a-tag v-if="record.type === 'global'" color="blue" size="small">全局</a-tag>
          <a-tag v-else color="purple" size="small">定向</a-tag>
        </template>
        <template #scope="{ record }">{{ scopeText(record) }}</template>
        <template #pinned="{ record }">
          <a-tag v-if="record.pinned" color="red" size="small">是</a-tag>
          <span v-else class="muted">否</span>
        </template>
        <template #forcePopup="{ record }">
          <a-tag v-if="record.forcePopup" color="orange" size="small">是</a-tag>
          <span v-else class="muted">否</span>
        </template>
        <template #operations="{ record }">
          <a-space>
            <a-button type="text" size="small" @click="openEdit(record)">编辑</a-button>
            <a-popconfirm content="确认删除该公告吗？" type="warning" @ok="handleDelete(record)">
              <a-button type="text" status="danger" size="small">删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </a-table>
    </a-card>

    <!-- 新增/编辑公告弹窗 -->
    <a-modal
      v-model:visible="modalVisible"
      :title="editing ? '编辑公告' : '新增公告'"
      :ok-loading="submitting"
      :mask-closable="false"
      :width="600"
      @ok="handleSubmit"
    >
      <a-form ref="formRef" :model="form" :rules="formRules" layout="vertical">
        <a-form-item field="title" label="标题" required>
          <a-input v-model="form.title" placeholder="请输入公告标题" allow-clear />
        </a-form-item>
        <a-form-item field="content" label="内容">
          <a-textarea
            v-model="form.content"
            placeholder="请输入公告内容"
            :auto-size="{ minRows: 3, maxRows: 8 }"
            allow-clear
          />
        </a-form-item>
        <a-grid :cols="2" :col-gap="16" :row-gap="0">
          <a-grid-item>
            <a-form-item field="type" label="类型">
              <a-select v-model="form.type">
                <a-option value="global">全局</a-option>
                <a-option value="targeted">定向</a-option>
              </a-select>
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="expireAt" label="到期时间">
              <a-date-picker
                v-model="form.expireAt"
                value-format="YYYY-MM-DD"
                placeholder="选择到期日期"
                style="width: 100%"
              />
            </a-form-item>
          </a-grid-item>
        </a-grid>
        <a-form-item v-if="form.type === 'targeted'" label="推送范围" required>
          <a-select
            v-model="form.scope"
            multiple
            allow-clear
            allow-search
            placeholder="选择楼层"
          >
            <a-optgroup label="楼层">
              <a-option v-for="f in floorList" :key="f.id" :value="f.id">{{ f.name }}</a-option>
            </a-optgroup>
          </a-select>
        </a-form-item>
        <a-grid :cols="2" :col-gap="16" :row-gap="0">
          <a-grid-item>
            <a-form-item field="pinned" label="置顶">
              <a-switch v-model="form.pinned" />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="forcePopup" label="强制弹窗">
              <a-switch v-model="form.forcePopup" />
            </a-form-item>
          </a-grid-item>
        </a-grid>
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

.muted {
  color: var(--color-text-4);
}
</style>
