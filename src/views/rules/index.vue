<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Message } from '@arco-design/web-vue';
import { useAdminStore } from '@/store/admin';
import type { RollCallRule } from '@/types';

const store = useAdminStore();

const weeklyOffOptions = [
  { label: '周日', value: 0 },
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
];

const weeklyOffMap: Record<number, string> = {
  0: '周日',
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
};

const createForm = (): RollCallRule => ({
  dailyStartTime: '10:00',
  dailyEndTime: '11:00',
  absentThreshold: '11:30',
  remindBefore: 10,
  holidays: [],
  weeklyOff: [0, 6],
  enableAutoAbsent: true,
});

const form = reactive<RollCallRule>(createForm());
const holidayInput = ref('');
const saving = ref(false);

function syncFromStore() {
  const r = store.rule;
  Object.assign(form, {
    dailyStartTime: r.dailyStartTime ?? '10:00',
    dailyEndTime: r.dailyEndTime ?? '11:00',
    absentThreshold: r.absentThreshold ?? '11:30',
    remindBefore: r.remindBefore ?? 0,
    holidays: Array.isArray(r.holidays) ? [...r.holidays] : [],
    weeklyOff: Array.isArray(r.weeklyOff) ? [...r.weeklyOff] : [],
    enableAutoAbsent: !!r.enableAutoAbsent,
  });
}

onMounted(syncFromStore);

function addHoliday() {
  const d = holidayInput.value;
  if (!d) {
    Message.warning('请先选择日期');
    return;
  }
  if (form.holidays.includes(d)) {
    Message.warning('该日期已存在');
    return;
  }
  form.holidays = [...form.holidays, d].sort();
  holidayInput.value = '';
}

function removeHoliday(d: string) {
  form.holidays = form.holidays.filter((x) => x !== d);
}

const previewLines = computed(() => {
  const off = form.weeklyOff
    .slice()
    .sort((a, b) => a - b)
    .map((d) => weeklyOffMap[d])
    .join('、') || '无';
  const holidays = form.holidays.length ? form.holidays.join('、') : '无';
  return [
    `每日点名时间：${form.dailyStartTime} ~ ${form.dailyEndTime}`,
    `自动缺勤判定时间：${form.absentThreshold}（${form.enableAutoAbsent ? '已启用' : '已关闭'}）`,
    `提前提醒：点名开始前 ${form.remindBefore} 分钟提醒商户`,
    `每周休息日：${off}`,
    `节假日（不点名）：${holidays}`,
  ];
});

async function handleSave() {
  saving.value = true;
  try {
    await store.updateRule({ ...form });
    Message.success('规则保存成功');
  } catch {
    Message.error('规则保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="page-container">
    <a-card title="点名规则配置">
      <div class="toolbar">
        <span class="section-title">规则设置</span>
        <a-button type="primary" :loading="saving" @click="handleSave">
          <template #icon><icon-save /></template>
          保存规则
        </a-button>
      </div>

      <a-form :model="form" layout="vertical">
        <a-grid :cols="2" :col-gap="16" :row-gap="0">
          <a-grid-item>
            <a-form-item field="dailyStartTime" label="每日点名开始时间">
              <a-time-picker
                v-model="form.dailyStartTime"
                format="HH:mm"
                value-format="HH:mm"
                placeholder="选择时间"
                style="width: 100%"
              />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="dailyEndTime" label="每日点名结束时间">
              <a-time-picker
                v-model="form.dailyEndTime"
                format="HH:mm"
                value-format="HH:mm"
                placeholder="选择时间"
                style="width: 100%"
              />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="absentThreshold" label="自动缺勤判定时间">
              <a-time-picker
                v-model="form.absentThreshold"
                format="HH:mm"
                value-format="HH:mm"
                placeholder="选择时间"
                style="width: 100%"
              />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="remindBefore" label="提前提醒分钟数">
              <a-input-number
                v-model="form.remindBefore"
                :min="0"
                :max="120"
                :step="1"
                :precision="0"
                style="width: 100%"
                placeholder="分钟"
              />
            </a-form-item>
          </a-grid-item>
          <a-grid-item :span="2">
            <a-form-item field="enableAutoAbsent" label="启用自动缺勤判定">
              <a-switch v-model="form.enableAutoAbsent" />
              <span class="hint">开启后，超过判定时间未签到的商户将自动记为缺勤</span>
            </a-form-item>
          </a-grid-item>
          <a-grid-item :span="2">
            <a-form-item field="weeklyOff" label="每周休息日">
              <a-checkbox-group v-model="form.weeklyOff">
                <a-checkbox v-for="o in weeklyOffOptions" :key="o.value" :value="o.value">
                  {{ o.label }}
                </a-checkbox>
              </a-checkbox-group>
            </a-form-item>
          </a-grid-item>
          <a-grid-item :span="2">
            <a-form-item label="节假日（不点名日期）">
              <a-space>
                <a-date-picker
                  v-model="holidayInput"
                  value-format="YYYY-MM-DD"
                  placeholder="选择日期"
                  style="width: 200px"
                />
                <a-button type="primary" @click="addHoliday">
                  <template #icon><icon-plus /></template>
                  添加
                </a-button>
              </a-space>
              <div v-if="form.holidays.length" class="holiday-list">
                <a-tag
                  v-for="d in form.holidays"
                  :key="d"
                  closable
                  @close="removeHoliday(d)"
                >{{ d }}</a-tag>
              </div>
              <div v-else class="hint">暂无节假日</div>
            </a-form-item>
          </a-grid-item>
        </a-grid>
      </a-form>

      <div class="preview-block">
        <div class="section-title">规则预览</div>
        <ul class="preview-list">
          <li v-for="(line, i) in previewLines" :key="i">{{ line }}</li>
        </ul>
      </div>
    </a-card>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-1);
}

.hint {
  margin-left: 12px;
  font-size: 12px;
  color: var(--color-text-3);
}

.holiday-list {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preview-block {
  margin-top: 24px;
  padding: 16px;
  background-color: var(--color-fill-1);
  border-radius: 4px;
}

.preview-list {
  margin: 12px 0 0;
  padding-left: 20px;
  color: var(--color-text-2);
  line-height: 2;
}

.preview-list li {
  list-style: disc;
}
</style>
