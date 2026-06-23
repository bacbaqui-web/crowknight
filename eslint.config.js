import js from '@eslint/js';

const browserGlobals = {
  addEventListener: 'readonly',
  clearTimeout: 'readonly',
  CustomEvent: 'readonly',
  document: 'readonly',
  Event: 'readonly',
  Image: 'readonly',
  localStorage: 'readonly',
  Math: 'readonly',
  performance: 'readonly',
  requestAnimationFrame: 'readonly',
  setTimeout: 'readonly',
  window: 'readonly',
};

export default [
  {
    ignores: ['node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: browserGlobals,
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
