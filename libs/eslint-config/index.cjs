module.exports = {
  parser: "@typescript-eslint/parser",
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "xo",
    "plugin:unicorn/all",
    "prettier",
    "plugin:import/recommended",
    "plugin:import/typescript",
  ],
  plugins: ["@typescript-eslint", "eslint-plugin-tsdoc"],
  settings: {
    jsdoc: { mode: "typescript" },
    node: { tryExtensions: [".ts", ".js", ".json"] },
  },
  rules: {
    camelcase: ["error", { properties: "never", ignoreDestructuring: true }],
    quotes: ["error", "double", { avoidEscape: true }],
    "no-undef": "off", // Typescript handles this
    "no-dupe-class-members": "off", // Overridden by @typescript-eslint
    "no-loop-func": "off", // Overridden by @typescript-eslint
    "no-loss-of-precision": "off", // Overridden by @typescript-eslint
    "no-redeclare": "off", // Overridden by @typescript-eslint
    "no-shadow": "off", // Overridden by @typescript-eslint
    "no-unused-expressions": "off", // Overridden by @typescript-eslint
    "no-use-before-define": "off", // Overridden by @typescript-eslint
    "no-useless-constructor": "off", // Overridden by @typescript-eslint
    "no-unused-vars": "off", // Overridden by @typescript-eslint
    "no-constant-condition": ["error", { checkLoops: false }],
    "object-shorthand": "off", // Conflicts with method-signature-style
    "no-warning-comments": "off",
    "max-params": ["error", 5],
    "require-await": "error",

    "@typescript-eslint/array-type": ["error", { default: "array-simple" }],
    "@typescript-eslint/ban-ts-comment": [
      "error",
      {
        "ts-check": true,
        "ts-expect-error": "allow-with-description",
        "ts-ignore": false,
        "ts-nocheck": false,
      },
    ],
    "@typescript-eslint/explicit-member-accessibility": "error",
    "@typescript-eslint/consistent-type-assertions": [
      "error",
      {
        assertionStyle: "as",
        objectLiteralTypeAssertions: "allow-as-parameter",
      },
    ],
    "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { prefer: "type-imports" },
    ],
    "@typescript-eslint/default-param-last": "error",
    "@typescript-eslint/method-signature-style": ["error", "property"],
    "@typescript-eslint/naming-convention": [
      "error",
      {
        leadingUnderscore: "allowSingleOrDouble",
        trailingUnderscore: "allowDouble",
        format: ["camelCase", "UPPER_CASE", "PascalCase"],
        selector: "variable",
      },
    ],
    "@typescript-eslint/no-dupe-class-members": "error",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-loop-func": "error",
    "@typescript-eslint/no-loss-of-precision": "error",
    "@typescript-eslint/no-namespace": ["error", { allowDeclarations: true }],
    "@typescript-eslint/no-redeclare": "error",
    "@typescript-eslint/no-require-imports": "off",
    "@typescript-eslint/no-shadow": "error",
    "@typescript-eslint/no-unused-expressions": "error",
    "@typescript-eslint/no-use-before-define": ["error", "nofunc"],
    "@typescript-eslint/no-useless-constructor": "error",
    "@typescript-eslint/no-useless-empty-export": "error",
    "@typescript-eslint/prefer-enum-initializers": "error",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unsafe-return": "off",
    "@typescript-eslint/no-unsafe-argument": "off",
    "@typescript-eslint/restrict-template-expressions": "off",
    "@typescript-eslint/no-var-requires": "off", // Handled by @typescript-eslint/no-require-imports
    "@typescript-eslint/restrict-plus-operands": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/no-extraneous-class": "off", // ECS Component classes can be empty

    "unicorn/no-keyword-prefix": "off",
    "unicorn/prevent-abbreviations": "off",
    "unicorn/no-useless-undefined": "off",
    "unicorn/numeric-separators-style": [
      "error",
      { hexadecimal: { minimumDigits: 9 } },
    ],
    "unicorn/consistent-function-scoping": [
      "error",
      { checkArrowFunctions: false },
    ],
    "unicorn/require-post-message-target-origin": "off",
  },
  overrides: [
    {
      files: ["vite.config.ts", "vitest.config.ts"],
      rules: {
        "unicorn/prefer-module": "off",
      },
    },
  ],
};
