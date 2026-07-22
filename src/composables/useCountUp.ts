import { ref, watch, onMounted } from 'vue';

export function useCountUp(target: () => number, duration = 600) {
  const display = ref(0);
  let raf: number | null = null;

  function animate(to: number) {
    if (raf) cancelAnimationFrame(raf);
    const from = display.value;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      display.value = Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  onMounted(() => animate(target()));
  watch(target, (v) => animate(v));

  return display;
}
