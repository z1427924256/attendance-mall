import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tsconfigPaths from 'vite-tsconfig-paths';
import { vitePluginForArco } from '@arco-plugins/vite-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ArcoResolver } from 'unplugin-vue-components/resolvers';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  base: '/admin/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    vue(),
    vitePluginForArco({
      style: 'css',
    }),
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia', '@vueuse/core'],
      resolvers: [ArcoResolver()],
      dts: 'src/types/auto-imports.d.ts',
      eslintrc: { enabled: false },
    }),
    Components({
      resolvers: [
        ArcoResolver({
          sideEffect: true,
        }),
      ],
      dts: 'src/types/components.d.ts',
      dirs: ['src/components'],
    }),
    tsconfigPaths(),
  ],
  build: {
    sourcemap: 'hidden',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'arco-design': ['@arco-design/web-vue'],
          vchart: ['@visactor/vchart', '@visactor/vchart-arco-theme'],
          vendor: ['vue', 'vue-router', 'pinia', 'axios', 'dayjs'],
        },
      },
    },
  },
});
