import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import markdown from '@eslint/markdown'

import prettierPlugin from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/.cache/**',
      '**/coverage/**',
      '**/*.d.ts'
    ]
  },

  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-extra-semi': 'error',
      'no-undef': 'error'
    }
  },

  ...tseslint.configs.recommended.map((c) => ({
    ...c,
    files: ['**/*.{ts,mts,cts}']
  })),

  {
    files: ['**/*.{ts,mts,cts}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',

      'no-undef': 'off',

      'no-extra-semi': 'error'
    }
  },

  {
    files: ['**/*.md'],
    plugins: { markdown },
    language: 'markdown/gfm',
    extends: ['markdown/recommended']
  },

  prettierConfig,
  {
    plugins: { prettier: prettierPlugin },
    rules: {
      'prettier/prettier': 'warn'
    }
  }
)
