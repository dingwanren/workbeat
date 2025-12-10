// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        fetch: 'readonly',
        console: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      // 要求使用 const 或 let
      'prefer-const': 'error',
      // 禁止使用未声明的变量
      'no-undef': 'error',
      // 允许使用 console (对于 CLI 工具是必需的)
      'no-console': 'off',
      // 禁止使用 debugger
      'no-debugger': 'error',
      // 禁止使用 eval
      'no-eval': 'error',
      // 允许字符串拼接（对于 CLI 表格显示是合理的）
      'prefer-template': 'off',
      // 要求使用箭头函数
      'prefer-arrow-callback': 'error',
      // 要求使用解构
      'prefer-destructuring': ['error', {
        VariableDeclarator: {
          array: false,
          object: true,
        },
        AssignmentExpression: {
          array: false,
          object: true,
        },
      }],
      // 禁止不必要的转义
      'no-useless-escape': 'error',
      // 禁止重复导入
      'no-duplicate-imports': 'error',
      // 禁止未使用的变量
      '@typescript-eslint/no-unused-vars': 'error',
      // 禁止使用 any
      // '@typescript-eslint/no-explicit-any': 'error',
      // 要求使用单引号
      'quotes': ['error', 'single'],
      // 要求在接口上使用 'I' 前缀（可选）
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: {
            regex: '^I[A-Z]',
            match: false,
          },
        },
      ],
    },
    ignores: [
      'dist/',
      'node_modules/',
      '*.config.*',
    ],
  }
);