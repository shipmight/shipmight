module.exports = {
  root: true,
  plugins: ["react", "@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: "module",
  },
  env: {
    es2021: true,
  },
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "next" },
    ],
    "@typescript-eslint/no-empty-interface": "off",
    "no-constant-condition": "off",
    "object-shorthand": "warn",
    "import/no-named-as-default-member": "off",
    "import/no-restricted-paths": [
      "error",
      {
        zones: [
          { target: "./src/backend", from: "./src/frontend" },
          {
            target: "./src/frontend",
            from: "./src/backend",
            except: [
              "api/apiSchema.json",
              "api/generated/apiSchema.ts",
              "api/requests.ts",
            ],
          },
        ],
      },
    ],
  },
  settings: {
    react: {
      version: "detect",
    },
    "import/parsers": {
      "@typescript-eslint/parser": [".ts", ".tsx"],
    },
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
      },
    },
  },
  overrides: [
    {
      files: [
        ".eslintrc.js",
        "jest.config.js",
        "src/backend/**/*",
        "release/dev-utils/build.js",
        "release/dev-utils/release.js",
        "babelrc.*.js",
      ],
      env: {
        node: true,
      },
    },
    {
      files: ["src/frontend/**/*"],
      env: {
        browser: true,
      },
    },
  ],
};
