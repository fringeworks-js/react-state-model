import createESLintConfig from '@fringeworks/dev/createESLintConfig';
import { defineConfig } from 'eslint/config';
import storybook from 'eslint-plugin-storybook';

export default defineConfig([
  createESLintConfig(import.meta.dirname, { react: true }),
  storybook.configs['flat/recommended'],
]);
