import nx from '@nx/eslint-plugin';
import tseslint from 'typescript-eslint';
import baseConfig from '../../eslint.config.mjs';
import { notaReactStrictRules } from '../../tools/eslint-react-strict.mjs';

export default [
  {
    ignores: ['postcss.config.cjs', 'eslint.config.mjs', 'scripts/**/*.mjs'],
  },
  ...baseConfig,
  ...nx.configs['flat/react'],
  notaReactStrictRules,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-empty-function': 'warn',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {},
  },
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@clerk/backend',
              message:
                'Clerk backend is server-only; use apps/nota-server instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.ts', 'vite-stubs/**/*.ts'],
    ...tseslint.configs.disableTypeChecked,
  },
];
