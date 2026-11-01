import { playwright } from '@vitest/browser-playwright';
import { configDefaults, defineConfig } from 'vitest/config';

/**
 * ブラウザーで実行するテスト（React の描画と setTimeout の順番など、実際のブラウザーでの動きを確かめる）
 */
const BROWSER_TEST = 'src/**/*.browser.test.{ts,tsx}';

/**
 * ブラウザーのテストの設定
 */
const browserProject = (
  name: string,
  browsers: ('chromium' | 'firefox' | 'webkit')[],
) => ({
  extends: true as const,
  test: {
    name,
    include: [BROWSER_TEST],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: browsers.map((browser) => ({ browser })),
    },
  },
});

export default defineConfig({
  // link:で参照したパッケージが別のReactを読み込まないようにする
  resolve: { dedupe: ['react', 'react-dom'] },
  test: {
    globals: true,
    coverage: { enabled: true },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          exclude: [...configDefaults.exclude, BROWSER_TEST],
        },
      },
      // 普段は Chromium だけで実行する
      browserProject('browser', ['chromium']),
      // React の描画とタイマーの順番はエンジンごとに違いうるため、公開の前などに3つのエンジンで確かめる（pnpm test:browsers）
      browserProject('all-browsers', ['chromium', 'firefox', 'webkit']),
    ],
  },
});
