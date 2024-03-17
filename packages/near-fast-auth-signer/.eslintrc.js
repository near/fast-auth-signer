module.exports = {
  env:      { browser: true, node: true, es2020: true },
  parser:   '@typescript-eslint/parser',
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx']
    },
    'import/extensions': [
      '.ts',
      '.tsx'
    ]
  },
  overrides: [{
    files: ['*.ts', '*.tsx'],
  }],
  ignorePatterns: ['dist'],
  extends:        ['airbnb', 'plugin:import/errors', 'plugin:import/typescript'],
  rules:          {
    'linebreak-style':                   0,
    'react/require-default-props':       'off',
    'react/prop-types':                  'off',
    'react/jsx-filename-extension':      'off',
    'react/jsx-props-no-spreading':      'off',
    'import/no-extraneous-dependencies': 'off',
    'import/prefer-default-export':      'off',
    'prefer-destructuring':                [
      'error', {
        VariableDeclarator:   {
          array:  false,
          object: true
        },
        AssignmentExpression: {
          array:  false,
          object: false
        }
      }, {
        enforceForRenamedProperties: false
      }
    ],
    'max-classes-per-file':                'off',
    indent:                                [
      'error', 2, {
        SwitchCase:         1,
        VariableDeclarator: { var: 2, let: 2, const: 3 },
        ObjectExpression:   'first'
      }
    ],
    semi:                                  ['error', 'always'],
    'comma-dangle':                        ['error', 'only-multiline'],
    'max-len':                             [
      'error', 120, {
        ignoreComments: true, ignoreStrings: true, ignoreTemplateLiterals: true
      }
    ],
    'no-multi-spaces':                     [
      'error', {
        exceptions: {
          ExportNamedDeclaration: true,
          VariableDeclarator:     true,
          AssignmentExpression:   true,
          AssignmentPattern:      true
        }
      }
    ],
    'global-require':                      'warn',
    'one-var':                             ['error', 'never'],
    strict:                                'off',
    camelcase:                             'off',
    'no-console':                          'off',
    'func-names':                          'off',
    'no-param-reassign':                   'off',
    'arrow-body-style':                    ['error', 'as-needed', { requireReturnForObjectLiteral: true }],
    'no-underscore-dangle':                'off',
    'import/extensions':    ['error',
      { json: 'always' }
    ],
    'import/order':                        [
      'error', {
        alphabetize:        {
          order:           'asc',
          caseInsensitive: true
        },
        'newlines-between': 'always',
        groups:             [
          'builtin',
          ['external', 'internal'],
          ['sibling', 'parent', 'index'],
          'object'
        ]
      }
    ],
    'arrow-parens':                        ['error', 'always'],
    'key-spacing':                         ['warn', { align: 'value', mode: 'minimum' }],
    'one-var-declaration-per-line':        ['error', 'initializations']
  },
};
