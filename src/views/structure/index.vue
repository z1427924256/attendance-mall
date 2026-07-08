<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Message } from '@arco-design/web-vue';
import * as api from '@/api/client';
import type { StructureItem } from '@/types';

type EntityType = 'floor' | 'area' | 'category';

const entityApi = {
  floor: {
    fetch: api.fetchFloors,
    create: api.createFloor,
    update: api.updateFloor,
    remove: api.deleteFloor,
    label: '楼层',
  },
  area: {
    fetch: api.fetchAreas,
    create: api.createArea,
    update: api.updateArea,
    remove: api.deleteArea,
    label: '区域',
  },
  category: {
    fetch: api.fetchCategories,
    create: api.createCategory,
    update: api.updateCategory,
    remove: api.deleteCategory,
    label: '业态分类',
  },
} as const;

interface FormState {
  name: string;
  sortOrder: number;
  status: 'active' | 'inactive';
  floorId?: string;
}

interface EntityState {
  list: StructureItem[];
  loading: boolean;
  modalVisible: boolean;
  submitting: boolean;
  editing: StructureItem | null;
  form: FormState;
}

function createState(): EntityState {
  return {
    list: [],
    loading: false,
    modalVisible: false,
    submitting: false,
    editing: null,
    form: { name: '', sortOrder: 0, status: 'active', floorId: '' },
  };
}

const states = reactive<Record<EntityType, EntityState>>({
  floor: createState(),
  area: createState(),
  category: createState(),
});

const activeTab = ref<EntityType>('floor');
const current = computed(() => states[activeTab.value]);
const entityLabel = computed(() => entityApi[activeTab.value].label);

const formRef = ref();
const formRules = {
  name: [{ required: true, message: '请输入名称' }],
};

const floorList = ref<StructureItem[]>([]);
const floorOptions = computed(() => floorList.value.filter((f) => f.status === 'active'));

function floorName(id?: string) {
  if (!id) return '-';
  return floorList.value.find((f) => f.id === id)?.name ?? '-';
}

async function loadList(type: EntityType) {
  const s = states[type];
  s.loading = true;
  try {
    s.list = await entityApi[type].fetch();
  } catch {
    Message.error(`加载${entityApi[type].label}列表失败`);
  } finally {
    s.loading = false;
  }
}

async function loadFloors() {
  try {
    floorList.value = await api.fetchFloors();
  } catch {
    floorList.value = [];
  }
}

onMounted(async () => {
  await loadFloors();
  await Promise.all([loadList('floor'), loadList('area'), loadList('category')]);
});

function onTabChange() {
  states.floor.modalVisible = false;
  states.area.modalVisible = false;
  states.category.modalVisible = false;
}

function openAdd() {
  const s = current.value;
  s.editing = null;
  s.form = { name: '', sortOrder: 0, status: 'active', floorId: '' };
  s.modalVisible = true;
}

function openEdit(record: StructureItem) {
  const s = current.value;
  s.editing = record;
  s.form = {
    name: record.name,
    sortOrder: record.sortOrder,
    status: record.status,
    floorId: record.floorId ?? '',
  };
  s.modalVisible = true;
}

async function handleSubmit() {
  const type = activeTab.value;
  const s = states[type];
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  s.submitting = true;
  try {
    const payload: Partial<StructureItem> = {
      name: s.form.name,
      sortOrder: s.form.sortOrder,
      status: s.form.status,
    };
    if (type === 'area') payload.floorId = s.form.floorId || undefined;
    if (s.editing) {
      await entityApi[type].update(s.editing.id, payload);
      Message.success(`${entityApi[type].label}更新成功`);
    } else {
      await entityApi[type].create(payload);
      Message.success(`${entityApi[type].label}新增成功`);
    }
    s.modalVisible = false;
    await loadList(type);
    if (type === 'floor') await loadFloors();
  } catch {
    Message.error(
      s.editing ? `${entityApi[type].label}更新失败` : `${entityApi[type].label}新增失败`
    );
  } finally {
    s.submitting = false;
  }
}

async function handleDelete(record: StructureItem) {
  const type = activeTab.value;
  try {
    await entityApi[type].remove(record.id);
    Message.success(`${entityApi[type].label}删除成功`);
    await loadList(type);
    if (type === 'floor') await loadFloors();
  } catch {
    Message.error(`${entityApi[type].label}删除失败`);
  }
}

const floorColumns = [
  { title: '名称', dataIndex: 'name' },
  { title: '排序', dataIndex: 'sortOrder', align: 'center' as const, width: 100 },
  { title: '状态', slotName: 'status', align: 'center' as const, width: 100 },
  { title: '创建时间', dataIndex: 'createdAt', width: 180 },
  { title: '操作', slotName: 'operations', width: 140, fixed: 'right' as const },
];

const areaColumns = [
  { title: '名称', dataIndex: 'name' },
  { title: '所属楼层', slotName: 'floor', width: 140 },
  { title: '排序', dataIndex: 'sortOrder', align: 'center' as const, width: 100 },
  { title: '状态', slotName: 'status', align: 'center' as const, width: 100 },
  { title: '创建时间', dataIndex: 'createdAt', width: 180 },
  { title: '操作', slotName: 'operations', width: 140, fixed: 'right' as const },
];

const categoryColumns = floorColumns;

const pagination = { pageSize: 10, showTotal: true };
</script>

<template>
  <div class="page-container">
    <a-card title="架构管理">
      <a-tabs v-model:active-key="activeTab" @change="onTabChange">
        <!-- 楼层 -->
        <a-tab-pane key="floor" title="楼层">
          <div class="toolbar">
            <a-button type="primary" @click="openAdd">
              <template #icon><icon-plus /></template>
              新增楼层
            </a-button>
          </div>
          <a-table
            :data="states.floor.list"
            :columns="floorColumns"
            :loading="states.floor.loading"
            :pagination="pagination"
            row-key="id"
            size="medium"
            style="margin-top: 12px"
          >
            <template #status="{ record }">
              <a-tag v-if="record.status === 'active'" color="green" size="small">启用</a-tag>
              <a-tag v-else color="gray" size="small">停用</a-tag>
            </template>
            <template #operations="{ record }">
              <a-space>
                <a-button type="text" size="small" @click="openEdit(record)">编辑</a-button>
                <a-popconfirm content="确认删除该楼层吗？" type="warning" @ok="handleDelete(record)">
                  <a-button type="text" status="danger" size="small">删除</a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 区域 -->
        <a-tab-pane key="area" title="区域">
          <div class="toolbar">
            <a-button type="primary" @click="openAdd">
              <template #icon><icon-plus /></template>
              新增区域
            </a-button>
          </div>
          <a-table
            :data="states.area.list"
            :columns="areaColumns"
            :loading="states.area.loading"
            :pagination="pagination"
            row-key="id"
            size="medium"
            style="margin-top: 12px"
          >
            <template #floor="{ record }">{{ floorName(record.floorId) }}</template>
            <template #status="{ record }">
              <a-tag v-if="record.status === 'active'" color="green" size="small">启用</a-tag>
              <a-tag v-else color="gray" size="small">停用</a-tag>
            </template>
            <template #operations="{ record }">
              <a-space>
                <a-button type="text" size="small" @click="openEdit(record)">编辑</a-button>
                <a-popconfirm content="确认删除该区域吗？" type="warning" @ok="handleDelete(record)">
                  <a-button type="text" status="danger" size="small">删除</a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 业态分类 -->
        <a-tab-pane key="category" title="业态分类">
          <div class="toolbar">
            <a-button type="primary" @click="openAdd">
              <template #icon><icon-plus /></template>
              新增业态
            </a-button>
          </div>
          <a-table
            :data="states.category.list"
            :columns="categoryColumns"
            :loading="states.category.loading"
            :pagination="pagination"
            row-key="id"
            size="medium"
            style="margin-top: 12px"
          >
            <template #status="{ record }">
              <a-tag v-if="record.status === 'active'" color="green" size="small">启用</a-tag>
              <a-tag v-else color="gray" size="small">停用</a-tag>
            </template>
            <template #operations="{ record }">
              <a-space>
                <a-button type="text" size="small" @click="openEdit(record)">编辑</a-button>
                <a-popconfirm content="确认删除该业态吗？" type="warning" @ok="handleDelete(record)">
                  <a-button type="text" status="danger" size="small">删除</a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>

      <!-- 新增/编辑弹窗（共享） -->
      <a-modal
        v-model:visible="current.modalVisible"
        :title="(current.editing ? '编辑' : '新增') + entityLabel"
        :ok-loading="current.submitting"
        :mask-closable="false"
        @ok="handleSubmit"
      >
        <a-form ref="formRef" :model="current.form" :rules="formRules" layout="vertical">
          <a-form-item field="name" :label="entityLabel + '名称'" required>
            <a-input v-model="current.form.name" placeholder="请输入名称" allow-clear />
          </a-form-item>
          <a-form-item v-if="activeTab === 'area'" label="所属楼层">
            <a-select
              v-model="current.form.floorId"
              placeholder="请选择楼层"
              allow-clear
            >
              <a-option v-for="f in floorOptions" :key="f.id" :value="f.id">{{ f.name }}</a-option>
            </a-select>
          </a-form-item>
          <a-form-item label="排序">
            <a-input-number
              v-model="current.form.sortOrder"
              :min="0"
              :step="1"
              :precision="0"
              style="width: 100%"
              placeholder="数值越小越靠前"
            />
          </a-form-item>
          <a-form-item label="状态">
            <a-select v-model="current.form.status">
              <a-option value="active">启用</a-option>
              <a-option value="inactive">停用</a-option>
            </a-select>
          </a-form-item>
        </a-form>
      </a-modal>
    </a-card>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
