<script setup lang="ts">
import { ConfigProvider } from '@arco-design/web-vue';
import zhCN from '@arco-design/web-vue/es/locale/lang/zh-cn';
import { useTheme } from '@/composables/useTheme';

const { theme } = useTheme();
</script>

<template>
  <ConfigProvider :locale="zhCN" :theme="theme">
    <router-view />
  </ConfigProvider>
</template>
