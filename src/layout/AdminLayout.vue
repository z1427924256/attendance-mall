<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBreakpoints } from '@vueuse/core';
import { Message } from '@arco-design/web-vue';
import {
  IconMenuFold,
  IconMenuUnfold,
  IconPoweroff,
  IconUser,
  IconSunFill,
  IconMoonFill,
} from '@arco-design/web-vue/es/icon';
import { menuItems, menuGroups, type MenuItem } from '@/config/menu';
import { useTheme } from '@/composables/useTheme';

const route = useRoute();
const router = useRouter();
const collapsed = ref(false);
const isMobile = ref(false);

const { isDark, toggleTheme } = useTheme();

// 响应式：移动端抽屉
const breakpoints = useBreakpoints({ mobile: 768 });
isMobile.value = breakpoints.smaller('mobile').value;
watch(breakpoints.smaller('mobile'), (v) => (isMobile.value = v));

const selectedKeys = computed<string[]>(() => {
  const path = route.path;
  const match = menuItems.find((m) => path.startsWith(m.path));
  return match ? [match.key] : ['dashboard'];
});

const breadcrumb = computed(() => {
  const list: { label: string; path?: string }[] = [{ label: '后台管理' }];
  const match = menuItems.find((m) => route.path.startsWith(m.path));
  if (match) list.push({ label: match.label, path: match.path });
  return list;
});

// 按分组组织菜单
const groupedMenu = computed(() => {
  return menuGroups.map((g) => ({
    group: g,
    items: menuItems.filter((m) => m.group === g),
  }));
});

function onMenuClick(key: string) {
  const item = menuItems.find((m) => m.key === key);
  if (item) router.push(item.path);
  if (isMobile.value) drawerVisible.value = false;
}

const drawerVisible = ref(false);

function toggleSidebar() {
  if (isMobile.value) {
    drawerVisible.value = !drawerVisible.value;
  } else {
    collapsed.value = !collapsed.value;
  }
}

function handleLogout() {
  localStorage.clear();
  Message.success('已退出登录');
  router.push('/login');
}

onMounted(() => {
  if (isMobile.value) collapsed.value = true;
});
</script>

<template>
  <a-layout class="admin-layout">
    <!-- 桌面侧边栏 -->
    <a-layout-sider
      v-if="!isMobile"
      :width="232"
      :collapsed-width="64"
      :collapsible="false"
      v-model:collapsed="collapsed"
      class="admin-sider"
      :style="{ position: 'sticky', top: 0, height: '100vh' }"
    >
      <div class="sider-logo">
        <span v-if="!collapsed" class="logo-text">商场考勤管理</span>
        <span v-else class="logo-text-mini">考勤</span>
      </div>
      <a-menu
        :selected-keys="selectedKeys"
        :collapsed="collapsed"
        :style="{ width: '100%', borderRight: 'none' }"
        @menu-item-click="onMenuClick"
      >
        <template v-for="grp in groupedMenu" :key="grp.group">
          <a-menu-item-group :title="collapsed ? '' : grp.group">
            <a-menu-item v-for="item in grp.items" :key="item.key">
              <template #icon>
                <component :is="item.icon" v-if="item.icon" />
              </template>
              {{ item.label }}
            </a-menu-item>
          </a-menu-item-group>
        </template>
      </a-menu>
    </a-layout-sider>

    <!-- 移动端抽屉 -->
    <a-drawer
      v-if="isMobile"
      :visible="drawerVisible"
      placement="left"
      :width="232"
      :footer="false"
      @cancel="drawerVisible = false"
    >
      <template #title>商场考勤管理</template>
      <a-menu
        :selected-keys="selectedKeys"
        :style="{ width: '100%', borderRight: 'none' }"
        @menu-item-click="onMenuClick"
      >
        <template v-for="grp in groupedMenu" :key="grp.group">
          <a-menu-item-group :title="grp.group">
            <a-menu-item v-for="item in grp.items" :key="item.key">
              <template #icon>
                <component :is="item.icon" v-if="item.icon" />
              </template>
              {{ item.label }}
            </a-menu-item>
          </a-menu-item-group>
        </template>
      </a-menu>
    </a-drawer>

    <a-layout class="admin-main-layout">
      <a-layout-header class="admin-header">
        <div class="header-left">
          <a-button type="text" @click="toggleSidebar">
            <template #icon>
              <icon-menu-unfold v-if="collapsed && !isMobile" />
              <icon-menu-fold v-else />
            </template>
          </a-button>
          <a-breadcrumb class="header-breadcrumb">
            <a-breadcrumb-item v-for="b in breadcrumb" :key="b.path">
              {{ b.label }}
            </a-breadcrumb-item>
          </a-breadcrumb>
        </div>
        <div class="header-right">
          <a-tooltip :content="isDark ? '切换到亮色模式' : '切换到暗色模式'">
            <a-button type="text" shape="circle" @click="toggleTheme">
              <template #icon>
                <icon-moon-fill v-if="!isDark" />
                <icon-sun-fill v-else />
              </template>
            </a-button>
          </a-tooltip>
          <a-dropdown>
            <a-space style="cursor: pointer">
              <a-avatar :size="30">
                <icon-user />
              </a-avatar>
              <span>管理员</span>
            </a-space>
            <template #content>
              <a-doption @click="handleLogout">
                <template #icon><icon-poweroff /></template>
                退出登录
              </a-doption>
            </template>
          </a-dropdown>
        </div>
      </a-layout-header>

      <a-layout-content class="admin-content">
        <router-view v-slot="{ Component }">
          <transition name="admin-page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped>
.admin-layout {
  min-height: 100vh;
}

.admin-sider {
  background: var(--color-bg-1);
  border-right: 1px solid var(--color-neutral-3);
  overflow: auto;
}

.sider-logo {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--color-neutral-3);
  font-weight: 600;
  font-size: 16px;
  color: var(--color-text-1);
}

.logo-text {
  white-space: nowrap;
}

.logo-text-mini {
  font-size: 18px;
  font-weight: 700;
  color: rgb(var(--primary-6));
}

.admin-main-layout {
  background: var(--app-bg);
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-bg-1);
  border-bottom: 1px solid var(--color-neutral-3);
  padding: 0 16px;
  height: 56px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-breadcrumb {
  font-size: 14px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.admin-content {
  padding: 16px;
  min-height: calc(100vh - 56px);
}
</style>
