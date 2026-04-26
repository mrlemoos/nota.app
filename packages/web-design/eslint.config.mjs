import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';
import { notaReactStrictRules } from '../../tools/eslint-react-strict.mjs';

export default [
  ...nx.configs['flat/react'],
  ...baseConfig,
  notaReactStrictRules,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {},
  },
  {
    ignores: ['**/out-tsc'],
  },
];
