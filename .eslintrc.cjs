module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: [
    "standard-with-typescript",
    'prettier',
    'plugin:prettier/recommended'
  ],
  // ignorePatterns: ['build', './eslintrc.cjs', 'vite.config.ts'],
  // include: ['src'],
  overrides: [
    {
      env: {
        "node": true
      },
      files: [
        ".eslintrc.{js,cjs}"
      ],
      parserOptions: {
        "sourceType": "script"
      }
    }
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  rules: {
    '@typescript-eslint/strict-boolean-expressions': 'off',
    '@typescript-eslint/restrict-template-expressions': 'off',
    '@typescript-eslint/prefer-nullish-coalescing': 'off'
    // "prettier/prettier": ["error", { "endOfLine": "off" }]
  },
}
