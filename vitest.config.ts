import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
    env: loadEnv('', process.cwd(), ''),
    testTimeout: 15000,

    projects: [
      {
        extends: true,
        test: {
          name: 'ci',
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          browser: {
            enabled: true,
            provider: 'webdriverio',
            instances: [
              {
                name: 'Safari',
                browser: 'safari',
                headless: false,
              },
              {
                name: 'Firefox',
                browser: 'firefox',
                headless: false,
              },
              {
                name: 'Chrome',
                browser: 'chrome',
                headless: false,
              },
            ],
          },
        },
      },
    ],
  },
});
