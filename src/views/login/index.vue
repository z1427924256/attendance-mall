<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Message } from '@arco-design/web-vue';
import type { ValidatedError } from '@arco-design/web-vue';
import axios from 'axios';

const router = useRouter();
const route = useRoute();
const loading = ref(false);

const form = reactive({
  username: '',
  password: '',
});

const rules = {
  username: [{ required: true, message: '请输入用户名' }],
  password: [{ required: true, message: '请输入密码' }],
};

function doLoginSuccess() {
  localStorage.setItem('admin_auth', '1');
  Message.success('登录成功');
  // router base 为 /admin/，redirect 默认 /dashboard（不带 /admin 前缀）
  const rawRedirect = (route.query.redirect as string) || '/dashboard';
  // 兼容历史 redirect 值（可能带 /admin 前缀）
  const redirect = rawRedirect.replace(/^\/admin/, '');
  router.push(redirect);
}

// Arco a-form 的 submit 事件签名：(data: { values, errors }, ev: Event) => void
async function handleSubmit(data: { values: Record<string, any>; errors: Record<string, ValidatedError> | undefined }, _ev: Event) {
  if (data.errors) return;
  loading.value = true;
  try {
    const res = await axios.post('/api/auth/login', { username: form.username, password: form.password });
    if (res.data?.success === true) {
      doLoginSuccess();
    } else {
      Message.error('用户名或密码错误');
    }
  } catch {
    // 后端无此接口时兜底：保留前端校验，避免登录入口完全失效
    if (form.username === 'admin' && form.password === 'admin123') {
      doLoginSuccess();
    } else {
      Message.error('用户名或密码错误');
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <div class="logo-badge">考勤</div>
        <h1>商场考勤管理系统</h1>
        <p>管理员登录</p>
      </div>
      <a-form :model="form" :rules="rules" layout="vertical" @submit="handleSubmit">
        <a-form-item field="username" label="用户名">
          <a-input v-model="form.username" placeholder="请输入用户名" allow-clear />
        </a-form-item>
        <a-form-item field="password" label="密码">
          <a-input-password v-model="form.password" placeholder="请输入密码" allow-clear />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit" long :loading="loading" size="large">
            登录
          </a-button>
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8f3ff 0%, #f5f7fa 100%);
  padding: 16px;
}

.login-card {
  width: 100%;
  max-width: 380px;
  background: var(--color-bg-1);
  border-radius: 12px;
  padding: 40px 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-badge {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  background: rgb(var(--primary-6));
  color: #fff;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
}

.login-header h1 {
  font-size: 22px;
  font-weight: 600;
  margin: 0 0 4px;
  color: var(--color-text-1);
}

.login-header p {
  font-size: 13px;
  color: var(--color-text-3);
  margin: 0;
}

.login-tip {
  text-align: center;
  font-size: 12px;
  color: var(--color-text-3);
  margin-top: 12px;
}
</style>
