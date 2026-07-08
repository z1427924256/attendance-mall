<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import BottomNav from '@/components/h5/BottomNav.vue';

const route = useRoute();
const hideNav = computed(() => route.meta.hideNav === true);
</script>

<template>
  <div class="h5-container">
    <router-view />
    <BottomNav v-if="!hideNav" />
  </div>
</template>
