<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Message } from '@arco-design/web-vue';
import type { FileItem } from '@arco-design/web-vue';
import { useAdminStore } from '@/store/admin';
import { uploadAvatar } from '@/api/client';
import type { Merchant } from '@/types';

const store = useAdminStore();

onMounted(() => {
  if (!store.merchants.length) store.loadFromApi();
});

const FLOOR_OPTIONS = ['1F', '2F', '3F', '4F'];

// ===== 筛选 =====
const searchName = ref('');
const filterFloor = ref('');

const filtered = computed(() =>
  store.merchants.filter((m) => {
    if (searchName.value && !m.name.includes(searchName.value)) return false;
    if (filterFloor.value && m.floor !== filterFloor.value) return false;
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
const uploading = ref(false);
const editing = ref<Merchant | null>(null);
const formRef = ref();

const createEmptyForm = (): Partial<Merchant> => ({
  name: '',
  floor: '1F',
  location: '',
  verified: false,
  avatar: '',
});

const form = reactive<Partial<Merchant>>(createEmptyForm());

const formRules = {
  name: [{ required: true, message: '请输入商户名称' }],
  floor: [{ required: true, message: '请选择楼层' }],
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
    verified: record.verified,
    avatar: record.avatar || '',
  });
  modalVisible.value = true;
}

// ===== 头像上传 =====
// 限制 2MB 且仅图片
function beforeUpload(file: File): boolean {
  const isImage = file.type.startsWith('image/');
  if (!isImage) {
    Message.warning('只能上传图片文件');
    return false;
  }
  if (file.size > 2 * 1024 * 1024) {
    Message.warning('图片不能超过 2MB');
    return false;
  }
  return true;
}

async function handleAvatarChange(fileItemList: FileItem[], fileItem: FileItem) {
  // auto-upload=false，选择文件后手动上传
  const f = fileItem.file;
  if (!f) return;
  if (!beforeUpload(f)) {
    // 校验失败：清空上传列表
    return;
  }
  uploading.value = true;
  try {
    const { url } = await uploadAvatar(f);
    form.avatar = url;
    Message.success('头像上传成功');
  } catch (e) {
    Message.error('头像上传失败：' + ((e as Error).message || ''));
  } finally {
    uploading.value = false;
  }
}

function removeAvatar() {
  form.avatar = '';
}

// 取商户名首字（用于无头像时显示）
function firstChar(name?: string) {
  return (name || '?').trim().charAt(0) || '?';
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
        verified: !!payload.verified,
        avatar: payload.avatar || '',
      });
      Message.success('商户更新成功');
    } else {
      await store.addMerchant({
        name: payload.name || '',
        floor: payload.floor || '1F',
        location: payload.location || '',
        verified: !!payload.verified,
        avatar: payload.avatar || '',
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
        :scroll="{ x: 900 }"
        style="margin-top: 12px"
      >
        <template #merchant="{ record }">
          <div class="merchant-cell">
            <a-avatar
              v-if="record.avatar"
              shape="square"
              :size="32"
              :image-url="record.avatar"
            />
            <a-avatar v-else shape="square" :size="32">{{ firstChar(record.name) }}</a-avatar>
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
        <!-- 头像 -->
        <a-form-item field="avatar" label="商户头像">
          <div class="avatar-row">
            <a-avatar
              v-if="form.avatar"
              shape="square"
              :size="80"
              :image-url="form.avatar"
            />
            <a-avatar v-else shape="square" :size="80">
              {{ firstChar(form.name) }}
            </a-avatar>
            <a-upload
              list-type="picture-card"
              :auto-upload="false"
              :show-file-list="false"
              :show-remove-button="false"
              :custom-request="() => {}"
              accept="image/*"
              @change="handleAvatarChange"
            >
              <template #upload-button>
                <a-button :loading="uploading" type="outline">
                  <template #icon><icon-upload /></template>
                  选择图片
                </a-button>
              </template>
            </a-upload>
            <a-button v-if="form.avatar" status="danger" type="text" @click="removeAvatar">
              移除头像
            </a-button>
          </div>
          <span class="hint">仅支持图片，单文件不超过 2MB</span>
        </a-form-item>

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

.avatar-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-3);
}
</style>
