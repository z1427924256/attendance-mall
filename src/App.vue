<script setup lang="ts">
import { ConfigProvider } from '@arco-design/web-vue';
import zhCN from '@arco-design/web-vue/es/locale/lang/zh-cn';
</script>

<template>
  <ConfigProvider :locale="zhCN">
    <router-view />
  </ConfigProvider>
</template>
