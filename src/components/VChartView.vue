<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import VChart from '@visactor/vchart';

const props = defineProps<{
  spec: Record<string, unknown>;
  // spec 变化时是否重新渲染（默认深比较 JSON）
}>();

const domRef = ref<HTMLDivElement>();
let chart: VChart | null = null;

function render() {
  if (!domRef.value) return;
  try {
    chart?.release();
    chart = new VChart(props.spec as any, { dom: domRef.value });
    chart.renderSync();
  } catch (e) {
    console.error('VChart render error:', e);
  }
}

onMounted(render);

onBeforeUnmount(() => {
  chart?.release();
  chart = null;
});

watch(
  () => JSON.stringify(props.spec),
  () => render()
);
</script>

<template>
  <div ref="domRef" style="width: 100%; height: 100%" />
</template>
