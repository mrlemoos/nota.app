/**
 * Stricter React / jsx-a11y severities for app and design packages.
 * Plugins are already registered by Nx `flat/react`.
 */

/** @type {import('eslint').Linter.Config} */
export const notaReactStrictRules = {
  files: ['**/*.{ts,tsx,js,jsx}'],
  rules: {
    'react/jsx-key': 'error',
    'react/jsx-no-duplicate-props': 'error',
    'react/jsx-no-undef': 'error',
    'react/no-children-prop': 'error',
    'react/no-danger-with-children': 'error',
    'react/jsx-no-target-blank': 'error',
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/anchor-is-valid': 'error',
    'jsx-a11y/click-events-have-key-events': 'error',
  },
};
