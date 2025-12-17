import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import security from 'eslint-plugin-security';

export default [
  eslint.configs.recommended,
  prettierConfig,
  {
    files: ['js/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      globals: {
        google: 'readonly',
        console: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettier,
      security: security,
    },
    rules: {
      // Disable base rule as it can report incorrect errors with TypeScript
      'no-unused-vars': 'off',

      // TypeScript-specific rules
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // General code quality rules
      'no-console': ['warn', { allow: ['log', 'warn', 'error', 'info'] }],
      'no-debugger': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'warn',
      'no-duplicate-imports': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-unused-expressions': 'error',

      // Best practices
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-return-await': 'warn',

      // Complexity rules
      complexity: ['warn', 15], // Cyclomatic complexity threshold
      'max-depth': ['warn', 4], // Maximum nesting depth
      'max-lines-per-function': ['warn', { max: 150, skipBlankLines: true, skipComments: true }],
      'max-params': ['warn', 5], // Maximum function parameters
      'max-statements': ['warn', 30], // Maximum statements per function
      'max-nested-callbacks': ['warn', 3], // Maximum callback nesting

      // Security rules
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'warn',

      // Prettier integration
      'prettier/prettier': 'error',
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.netlify/**',
      '*.js',
      '*.mjs',
      'scripts/**',
      'utils/**',
    ],
  },
];