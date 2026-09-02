import love from "eslint-config-love";
import prettierConfig from "eslint-config-prettier";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";

export default [
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**", "public/**"],
  },
  {
    ...love,
    files: ["src/**/*.{js,ts,jsx,tsx}", "demo/**/*.ts"],
    languageOptions: {
      ...love.languageOptions,
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      ...love.rules,
      "@typescript-eslint/strict-boolean-expressions": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      // Function-size limits fit lower-level code, not this file's cohesive
      // constructor/handler methods — raise the ceiling instead of splitting
      // methods purely to satisfy the linter.
      complexity: ["error", { variant: "modified", max: 16 }],
      // Small literal counts (debug levels 0-2, keydown/keypress/keyup, etc.)
      // read fine inline in a library this size.
      "@typescript-eslint/no-magic-numbers": "off",
      // BindKeyboard#add takes (keyCombination, callback, preventRepeat,
      // type, options) — dropping to 4 would mean breaking the established
      // positional call signature just to satisfy the linter.
      "@typescript-eslint/max-params": ["error", { max: 5 }],
      // The project targets ES2020 (see tsconfig.json); the 'v' flag needs
      // ES2024+, so require the 'u' flag instead.
      "require-unicode-regexp": ["error", { requireFlag: "u" }],
    },
  },
  {
    // bun:test's fluent matcher API (`expect(...).toHaveBeenCalled()`,
    // `jest.fn()`) isn't resolvable by typescript-eslint's type-aware
    // checker, so the unsafe-* family fires on every assertion here. This is
    // a known friction point with Bun's test types, not a real safety issue.
    files: ["src/**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
    },
  },
  prettierConfig,
  prettierRecommended,
];
