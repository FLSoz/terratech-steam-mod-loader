/* eslint-disable prettier/prettier */
module.exports = {
  extends: 'erb',
  rules: {
    // A temporary hack related to IDE not resolving correct package.json
    'import/no-extraneous-dependencies': 'off',
    'prettier/prettier': ['error', {
			singleQuote: true,
			trailingComma: 'none',
			tabWidth: 2,
			useTabs: true,
			printWidth: 160,
			bracketSameLine: false
		}],
		"no-restricted-imports": [
      "error",
      {
        "patterns": ["@mui/*/*/*", "!@mui/material/test-utils/*"]
      }
    ],
    'comma-dangle': ['error', 'never'],
    'max-len': [
      'warn',
      {
        code: 180,
        ignoreComments: true,
				ignoreUrls: true,
        ignoreTrailingComments: true
      }
    ],
		'react/no-unused-state': 'warn',
		'react/destructuring-assignment': 'warn',
		'react/no-access-state-in-setstate': 'warn',
		'react/no-direct-mutation-state': 'warn',
		'react/jsx-props-no-spreading': 'off',
		'promise/always-return': 'warn',
		'promise/catch-or-return': ['warn', { terminationMethod: ['catch', 'asCallback', 'finally'] }],
		'@typescript-eslint/no-explicit-any': 'warn',
		'no-console': "off",
		'@typescript-eslint/no-non-null-assertion': 'off',
		'class-methods-use-this': 'warn',
		'prefer-destructuring': 'warn'
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    createDefaultProgram: true
  },
  settings: {
    'import/resolver': {
      // See https://github.com/benmosher/eslint-plugin-import/issues/1396#issuecomment-575727774 for line below
      node: {},
      webpack: {
        config: require.resolve('./.erb/configs/webpack.config.eslint.ts')
      }
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx']
    }
  }
};
