/**
 * Flat ESLint overrides applied after strict TypeScript + import rules.
 * Keep patterns narrow — prefer fixing code over weakening rules.
 */

const testFiles = [
  '**/*.{spec,test}.{ts,tsx}',
  '**/vitest.setup.ts',
  '**/test-setup.{ts,tsx}',
];

/** @type {import('eslint').Linter.Config[]} */
export const notaEslintOverrides = [
  {
    files: ['packages/database-types/src/lib/database.types.ts'],
    rules: {
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-wrapper-object-types': 'off',
    },
  },
  {
    files: testFiles,
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-misused-spread': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-dynamic-delete': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
  {
    files: ['**/vite-stubs/**/*.ts'],
    rules: {
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
];
