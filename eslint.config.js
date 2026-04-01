
import globals from "globals";
import pluginJs from "@eslint/js";
import jest from "eslint-plugin-jest";

export default [
  {
    files: ["**/*.js"],
    ignores: [
      "frontend/**",
      "documentation/**",
      "database/**",
      "node_modules/**"
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs"
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-console": "off"
    }
  }
];
