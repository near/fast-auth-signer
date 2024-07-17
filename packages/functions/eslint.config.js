const eslint = require('@eslint/js');
const tseslintPlugin = require('@typescript-eslint/eslint-plugin');
const tseslintParser = require('@typescript-eslint/parser');
const importPlugin = require('eslint-plugin-import');
const airbnbBase = require('eslint-config-airbnb-base');

module.exports = [
  eslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        project: './tsconfig.json',
      },
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslintPlugin,
      import: importPlugin,
    },
    rules: {
      ...airbnbBase.rules,
      ...tseslintPlugin.configs.recommended.rules,
      // Your existing rules here...
      'linebreak-style': 0,
      'import/no-extraneous-dependencies': 'off',
      'import/prefer-default-export': 'off',
      'prefer-destructuring': [
        'error',
        {
          VariableDeclarator: {
            array: false,
            object: true,
          },
          AssignmentExpression: {
            array: false,
            object: false,
          },
        },
        {
          enforceForRenamedProperties: false,
        },
      ],
      'max-classes-per-file': 'off',
      indent: [
        'error',
        2,
        {
          SwitchCase: 1,
          VariableDeclarator: { var: 2, let: 2, const: 3 },
          ObjectExpression: 'first',
        },
      ],
      semi: ['error', 'always'],
      'comma-dangle': ['error', 'only-multiline'],
      'max-len': [
        'error',
        120,
        {
          ignoreComments: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
        },
      ],
      'no-multi-spaces': [
        'error',
        {
          exceptions: {
            ExportNamedDeclaration: true,
            VariableDeclarator: true,
            AssignmentExpression: true,
            AssignmentPattern: true,
          },
        },
      ],
      'global-require': 'warn',
      'one-var': ['error', 'never'],
      strict: 'off',
      camelcase: 'off',
      'no-console': 'off',
      'func-names': 'off',
      'no-param-reassign': 'off',
      'arrow-body-style': [
        'error',
        'as-needed',
        { requireReturnForObjectLiteral: true },
      ],
      'no-underscore-dangle': 'off',
      'import/extensions': ['error', { json: 'always' }],
      'import/order': [
        'error',
        {
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          'newlines-between': 'always',
          groups: [
            'builtin',
            ['external', 'internal'],
            ['sibling', 'parent', 'index'],
            'object',
          ],
        },
      ],
      'arrow-parens': ['error', 'always'],
      'key-spacing': ['warn', { align: 'value', mode: 'minimum' }],
      'one-var-declaration-per-line': ['error', 'initializations'],
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    ignores: ['node_modules/**', 'dist/**', 'lib/**', 'eslint.config.js'],
  },
];