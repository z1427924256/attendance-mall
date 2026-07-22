<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Message } from '@arco-design/web-vue';
import * as api from '@/api/client';
import type { EmailConfig } from '@/types';

interface EmailForm {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromName: string;
  fromEmail: string;
  recipients: string[];
}

const createForm = (): EmailForm => ({
  enabled: false,
  smtpHost: '',
  smtpPort: 465,
  smtpUser: '',
  smtpPassword: '',
  fromName: '商场考勤管理系统',
  fromEmail: '',
  recipients: [],
});

const form = reactive<EmailForm>(createForm());
const formRef = ref();
const hasPassword = ref(false);
const saving = ref(false);
const loading = ref(false);
const testing = ref(false);

async function loadConfig() {
  loading.value = true;
  try {
    const cfg = (await api.fetchEmailConfig()) as Partial<EmailConfig>;
    form.enabled = !!cfg.enabled;
    form.smtpHost = cfg.smtpHost ?? '';
    form.smtpPort = cfg.smtpPort ?? 465;
    form.smtpUser = cfg.smtpUser ?? '';
    form.smtpPassword = '';
    form.fromName = cfg.fromName ?? '商场考勤管理系统';
    form.fromEmail = cfg.fromEmail ?? '';
    form.recipients = Array.isArray(cfg.recipients) ? [...cfg.recipients] : [];
    hasPassword.value = !!cfg.hasPassword;
  } catch {
    Message.error('加载邮件配置失败');
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  saving.value = true;
  try {
    // 密码为空时不传（后端保留原密码）
    const payload: Partial<EmailConfig> = {
      enabled: form.enabled,
      smtpHost: form.smtpHost,
      smtpPort: form.smtpPort,
      smtpUser: form.smtpUser,
      fromName: form.fromName,
      fromEmail: form.fromEmail,
      recipients: form.recipients,
    };
    if (form.smtpPassword && form.smtpPassword.length) {
      payload.smtpPassword = form.smtpPassword;
    }
    await api.updateEmailConfig(payload);
    Message.success('邮件配置保存成功');
    // 保存后重置密码输入框
    form.smtpPassword = '';
    hasPassword.value = !!(payload.smtpPassword ?? hasPassword.value);
    await loadConfig();
  } catch (e) {
    Message.error('邮件配置保存失败：' + ((e as Error).message || ''));
  } finally {
    saving.value = false;
  }
}

async function handleTest() {
  testing.value = true;
  try {
    const res = await api.testEmailConfig();
    Message.success(res.message || '测试邮件发送成功');
  } catch (e) {
    Message.error('测试失败：' + ((e as Error).message || ''));
  } finally {
    testing.value = false;
  }
}

onMounted(loadConfig);
</script>

<template>
  <div class="page-container">
    <a-card title="邮件配置">
      <div class="toolbar">
        <span class="section-title">SMTP 邮件推送</span>
        <a-space>
          <a-button :loading="loading" @click="loadConfig">
            <template #icon><icon-refresh /></template>
            重新加载
          </a-button>
          <a-button status="success" :loading="testing" @click="handleTest">
            <template #icon><icon-send /></template>
            发送测试
          </a-button>
          <a-button type="primary" :loading="saving" @click="handleSave">
            <template #icon><icon-save /></template>
            保存配置
          </a-button>
        </a-space>
      </div>

      <a-form ref="formRef" :model="form" layout="vertical">
        <a-form-item field="enabled" label="启用邮件推送">
          <a-switch v-model="form.enabled" />
          <span class="hint">开启后系统将按规则推送邮件通知</span>
        </a-form-item>
        <a-grid :cols="2" :col-gap="16" :row-gap="0">
          <a-grid-item>
            <a-form-item field="smtpHost" label="SMTP 服务器" required :rules="[{required:true,message:'请输入SMTP服务器'}]">
              <a-input
                v-model="form.smtpHost"
                placeholder="如 smtp.qq.com"
                allow-clear
              />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="smtpPort" label="端口" required>
              <a-input-number
                v-model="form.smtpPort"
                :min="1"
                :max="65535"
                :step="1"
                :precision="0"
                style="width: 100%"
                placeholder="默认 465"
              />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="smtpUser" label="用户名" required :rules="[{required:true,message:'请输入用户名'}]">
              <a-input v-model="form.smtpUser" placeholder="SMTP 登录用户名" allow-clear />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="smtpPassword" label="密码 / 授权码">
              <a-input-password
                v-model="form.smtpPassword"
                :placeholder="hasPassword ? '已设置，留空不修改' : '请输入密码或授权码'"
                allow-clear
              />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="fromName" label="发件人名称">
              <a-input v-model="form.fromName" placeholder="发件人显示名称" allow-clear />
            </a-form-item>
          </a-grid-item>
          <a-grid-item>
            <a-form-item field="fromEmail" label="发件邮箱" required :rules="[{required:true,message:'请输入发件邮箱'}]">
              <a-input v-model="form.fromEmail" placeholder="如 noreply@example.com" allow-clear />
            </a-form-item>
          </a-grid-item>
        </a-grid>

        <a-form-item field="recipients" label="收件人列表">
          <a-input-tag
            v-model="form.recipients"
            placeholder="输入邮箱地址后回车添加"
            allow-clear
          />
          <span class="hint hint--block">输入邮箱地址后按回车添加，可添加多个收件人</span>
        </a-form-item>
      </a-form>
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

.hint--block {
  display: block;
  margin-left: 0;
  margin-top: 4px;
}
</style>
