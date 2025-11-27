module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: undefined,
    tsconfigRootDir: __dirname,
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'jsx-a11y',
    'i18next',
    'testing-library',
    'vitest',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:i18next/recommended',
    'plugin:testing-library/react',
    'plugin:vitest-globals/recommended',
    'prettier',
  ],
  settings: {
    react: {
      version: 'detect',
    },
    i18next: {
      // Treat translation keys as coming from hooks and components
      ignoreTags: ['Trans'],
    },
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-empty-object-type': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/no-unused-expressions': 'warn',
    'react-hooks/rules-of-hooks': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'react-hooks/set-state-in-effect': 'warn',
    'react-hooks/preserve-manual-memoization': 'warn',
    'react/no-unescaped-entities': 'warn',
    'jsx-a11y/label-has-associated-control': 'warn',
    'jsx-a11y/no-redundant-roles': 'warn',
    'jsx-a11y/mouse-events-have-key-events': 'warn',
    'jsx-a11y/click-events-have-key-events': 'warn',
    'jsx-a11y/no-static-element-interactions': 'warn',
    'jsx-a11y/no-noninteractive-tabindex': 'warn',
    'testing-library/no-await-sync-queries': 'warn',
    'testing-library/no-unnecessary-act': 'warn',
    'testing-library/prefer-find-by': 'warn',
    'prefer-const': 'warn',
    'no-empty': ['warn', { allowEmptyCatch: true }],
    'i18next/no-literal-string': [
      'warn',
      {
        markupOnly: true,
        ignoreAttribute: [
          'className',
          'data-testid',
          'stroke',
          'fill',
          'aria-label',
          'aria-describedby',
          'role',
          'viewBox',
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
      env: {
        browser: true,
        es2022: true,
      },
      plugins: ['testing-library', 'vitest'],
      extends: ['plugin:testing-library/react'],
      rules: {
        'i18next/no-literal-string': 'off',
        'vitest/no-focused-tests': 'error',
        'vitest/no-identical-title': 'warn',
        'vitest/no-conditional-tests': 'warn',
        'vitest/expect-expect': 'off',
        'testing-library/no-await-sync-queries': 'warn',
      },
    },
    {
      files: ['*.d.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ],
};
