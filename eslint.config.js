const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");
const prettier = require("eslint-plugin-prettier");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

module.exports = [
  { ignores: ["**/_generated"] },
  ...compat.extends(
    "prettier",
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ),
  {
    plugins: {
      prettier,
    },

    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-require-imports": "off",
      "prettier/prettier": ["error"],
      "import/order": [
        "error",
        {
          pathGroups: [
            {
              pattern: "*(react|next)/**",
              patternOptions: { partial: true },
              group: "external",
              position: "before",
            },
            {
              pattern: "@suilend/**",
              patternOptions: { partial: true },
              group: "internal",
              position: "before",
            },
            {
              pattern: "@/*/**",
              group: "internal",
              position: "before",
            },
          ],
          pathGroupsExcludedImportTypes: [],
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
            "object",
            "type",
          ],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
      "sort-imports": [
        "error",
        {
          ignoreDeclarationSort: true,
        },
      ],
    },
  },
];
