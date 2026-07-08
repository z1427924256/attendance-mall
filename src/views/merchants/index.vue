<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Message } from '@arco-design/web-vue';
import { useAdminStore } from '@/store/admin';
import type { Merchant } from '@/types';

const store = useAdminStore();

onMounted(() => {
  if (!store.merchants.length) store.loadFromApi();
});

const FLOOR_OPTIONS = ['1F', '2F', '3F', '4F'];
const CATEGORY_OPTIONS = [
  '餐饮', '零售', '服装', '数码', '运动', '咖啡', '茶饮', '快餐',
  '火锅', '中餐', '西餐', '日料', '甜品', '美妆个护', '生活百货',
  '潮玩', '配套服务', '其他',
];

// ===== 筛选 =====
const searchName = ref('');
const filterFloor = ref('');
const filterCategory = ref('');

const filtered = computed(() =>
  store.merchants.filter((m) => {
    if (searchName.value && !m.name.includes(searchName.value)) return false;
    if (filterFloor.value && m.floor !== filterFloor.value) return false;
    if (filterCategory.value && m.category !== filterCategory.value) return false;
    return true;
  })
);

// ===== 统计 =====
const stats = computed(() => ({
  total: store.merchants.length,
  verified: store.merchants.filter((m) => m.verified).length,
  signedIn: store.merchants.filter((m) => m.signedIn).length,
  absent: store.merchants.filter((m) => m.absent).length,
}));

// ===== 弹窗 & 表单 =====
const modalVisible = ref(false);
const submitting = ref(false);
const editing = ref<Merchant | null>(null);
const formRef = ref();

const createEmptyForm = (): Partial<Merchant> => ({
  name: '',
  floor: '1F',
  location: '',
  category: '餐饮',
  emoji: '🏪',
  manager: '',
  contact: '',
  area: 0,
  openHours: '10:00-22:00',
  verified: false,
});

const form = reactive<Partial<Merchant>>(createEmptyForm());

const formRules = {
  name: [{ required: true, message: '请输入商户名称' }],
  floor: [{ required: true, message: '请选择楼层' }],
  category: [{ required: true, message: '请选择业态' }],
};

function openAdd() {
  editing.value = null;
  Object.assign(form, createEmptyForm());
  modalVisible.value = true;
}

function openEdit(record: Merchant) {
  editing.value = record;
  Object.assign(form, {
    name: record.name,
    floor: record.floor,
    location: record.location,
    category: record.category,
    emoji: record.emoji,
    manager: record.manager,
    contact: record.contact,
    area: record.area,
    openHours: record.openHours,
    verified: record.verified,
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
      await store.updateMerchant(editing.value.id, {
        name: payload.name,
        floor: payload.floor,
        location: payload.location,
        category: payload.category,
        emoji: payload.emoji,
        manager: payload.manager,
        contact: payload.contact,
        area: payload.area,
        openHours: payload.openHours,
        verified: !!payload.verified,
      });
      Message.success('商户更新成功');
    } else {
      await store.addMerchant({
        name: payload.name || '',
        floor: payload.floor || '1F',
        location: payload.location || '',
        category: payload.category || '其他',
        emoji: payload.emoji || '🏪',
        manager: payload.manager || '',
        contact: payload.contact || '',
        area: payload.area ?? 0,
        openHours: payload.openHours || '',
        verified: !!payload.verified,
        signedIn: false,
      });
      Message.success('商户新增成功');
    }
    modalVisible.value = false;
  } catch {
    Message.error(editing.value ? '商户更新失败' : '商户新增失败');
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(record: Merchant) {
  try {
    await store.removeMerchant(record.id);
    Message.success('商户删除成功');
  } catch {
    Message.error('商户删除失败');
  }
}

// ===== 表格列 =====
const columns = [
  { title: '商户', slotName: 'merchant', width: 220 },
  { title: '楼层', dataIndex: 'floor', width: 80, align: 'center' as const },
  { title: '铺位', dataIndex: 'location', width: 110 },
  { title: '业态', dataIndex: 'category', width: 110 },
  { title: '负责人', dataIndex: 'manager', width: 100 },
  { title: '联系电话', dataIndex: 'contact', width: 130 },
  { title: '面积(㎡)', dataIndex: 'area', width: 100, align: 'right' as const },
  { title: '营业时间', dataIndex: 'openHours', width: 140 },
  { title: '今日状态', slotName: 'status', width: 110, align: 'center' as const },
  { title: '操作', slotName: 'operations', width: 140, fixed: 'right' as const },
];

const pagination = {
  pageSize: 10,
  showTotal: true,
  showPageSize: true,
};
</script>

<template>
  <div class="page-container">
    <!-- 统计卡 -->
    <a-grid :cols="{ xs: 2, sm: 4 }" :col-gap="12" :row-gap="12" style="margin-bottom: 16px">
      <a-grid-item>
        <a-card>
          <div class="stat-card-value">{{ stats.total }}</div>
          <div class="stat-card-label">商户总数</div>
        </a-card>
      </a-grid-item>
      <a-grid-item>
        <a-card>
          <div class="stat-card-value" style="color: rgb(var(--primary-6))">{{ stats.verified }}</div>
          <div class="stat-card-label">已认证</div>
        </a-card>
      </a-grid-item>
      <a-grid-item>
        <a-card>
          <div class="stat-card-value" style="color: rgb(var(--green-6))">{{ stats.signedIn }}</div>
          <div class="stat-card-label">今日到岗</div>
        </a-card>
      </a-grid-item>
      <a-grid-item>
        <a-card>
          <div class="stat-card-value" style="color: rgb(var(--red-6))">{{ stats.absent }}</div>
          <div class="stat-card-label">今日缺勤</div>
        </a-card>
      </a-grid-item>
    </a-grid>

    <!-- 主表格 -->
    <a-card>
      <!-- 顶部筛选 + 新增按钮（放在 Card body 顶部） -->
      <div class="filter-bar">
        <a-space wrap>
          <a-input-search
            v-model="searchName"
            placeholder="搜索商户名称"
            style="width: 200px"
            allow-clear
          />
          <a-select
            v-model="filterFloor"
            placeholder="楼层"
            style="width: 120px"
            allow-clear
          >
            <a-option value="">全部</a-option>
            <a-option v-for="f in FLOOR_OPTIONS" :key="f" :value="f">{{ f }}</a-option>
          </a-select>
          <a-select
            v-model="filterCategory"
            placeholder="业态"
            style="width: 150px"
            allow-clear
          >
            <a-option value="">全部业态</a-option>
            <a-option v-for="c in CATEGORY_OPTIONS" :key="c" :value="c">{{ c }}</a-option>
          </a-select>
        </a-space>
        <a-button type="primary" @click="openAdd">
          <template #icon><icon-plus /></template>
          新增商户
        </a-button>
      </div>

      <a-table
        :data="filtered"
        :columns="columns"
        :pagination="pagination"
        :loading="store.loading"
        row-key="id"
        size="medium"
        :scroll="{ x: 1300 }"
        style="margin-top: 12px"
      >
        <template #merchant="{ record }">
          <div class="merchant-cell">
            <a-avatar shape="square" :size="32">{{ record.emoji }}</a-avatar>
            <span class="merchant-name">{{ record.name }}</span>
            <a-tag v-if="record.verified" color="green" size="small">认证</a-tag>
          </div>
        </template>

        <template #status="{ record }">
          <a-tag v-if="record.signedIn" color="green" size="small">已到岗</a-tag>
          <a-tag v-else-if="record.absent" color="red" size="small">缺勤</a-tag>
          <a-tag v-else color="gray" size="small">未签到</a-tag>
        </template>

        <template #operations="{ record }">
          <a-space>
            <a-button type="text" size="small" @click="openEdit(record)">编辑</a-button>
            <a-popconfirm content="确认删除该商户吗？" type="warning" @ok="handleDelete(record)">
              <a-button type="text" status="danger" size="small">删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </a-table>
    </a-card>

    <!-- 新增/编辑弹窗 -->
    <a-modal
      v-model:visible="modalVisible"
      :title="editing ? '编辑商户' : '新增商户'"
      :ok-loading="submitting"
      :mask-closable="false"
      @ok="handleSubmit"
    >
      <a-form ref="formRef" :model="form" :rules="formRules" layout="vertical">
        <a-grid :cols="2" :col-gap="16" :row-gap="0">
          <a-grid-item>
            <a-form-item field="name" label="商户名称" required>
              <a-input v-model="form.name" placeholder="请输入商户名称" allow-clear />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="floor" label="楼层" required>
              <a-select v-model="form.floor" placeholder="请选择楼层">
                <a-option v-for="f in FLOOR_OPTIONS" :key="f" :value="f">{{ f }}</a-option>
              </a-select>
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="location" label="铺位号">
              <a-input v-model="form.location" placeholder="如 2F-222" allow-clear />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="category" label="业态" required>
              <a-select v-model="form.category" placeholder="请选择业态">
                <a-option v-for="c in CATEGORY_OPTIONS" :key="c" :value="c">{{ c }}</a-option>
              </a-select>
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="emoji" label="Emoji 图标">
              <a-input v-model="form.emoji" placeholder="如 🏪" />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="manager" label="负责人">
              <a-input v-model="form.manager" placeholder="请输入负责人" allow-clear />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="contact" label="联系电话">
              <a-input v-model="form.contact" placeholder="请输入联系电话" allow-clear />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="area" label="面积 (㎡)">
              <a-input-number
                v-model="form.area"
                :min="0"
                :step="1"
                :precision="0"
                style="width: 100%"
                placeholder="请输入面积"
              />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="openHours" label="营业时间">
              <a-input v-model="form.openHours" placeholder="如 10:00-22:00" allow-clear />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="verified" label="认证状态">
              <a-switch v-model="form.verified" />
            </a-form-item>
          </a-grid-item>
        </a-grid>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.merchant-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.merchant-name {
  font-weight: 500;
  color: var(--color-text-1);
}
</style>
