import baseConfig from '../../eslint.config.mjs';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['eslint.config.mjs'],
  },
  ...baseConfig,
  {
    files: ['vitest.config.ts'],
    ...tseslint.configs.disableTypeChecked,
  },
];
