import { playwright } from '@vitest/browser-playwright';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

const dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

// ブラウザーのテストでカバレッジを取るときに、ブラウザーが読み込む coverage-v8 の場所。
// パッケージにも pnpm-workspace.yaml があるので、Vite はパッケージのフォルダーをルートとみなし、
// ワークスペースのルートの node_modules にあるこのファイルを読める範囲（server.fs.allow）から外してしまう
const coverageDir = path.dirname(
  createRequire(import.meta.url).resolve('@vitest/coverage-v8/package.json'),
);

export default defineConfig({
  server: { fs: { allow: [dirname, coverageDir] } },
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
      // V8 のカバレッジは Chromium でしか取れないので、pnpm test:browsers ではカバレッジを切る
      browserProject('all-browsers', ['chromium', 'firefox', 'webkit']),
    ],
  },
});
