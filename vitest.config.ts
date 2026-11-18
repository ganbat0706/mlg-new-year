import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    // Хэд хэдэн тест файл нэг бодит Postgres дээр truncate/sequence reset хийдэг тул
    // зэрэг ажиллуулбал (resetDb) өгөгдөл зөрчилдөнө. Файл бүрийг дараалан ажиллуулна.
    fileParallelism: false,
  },
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
});
