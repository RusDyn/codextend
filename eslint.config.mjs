import js from "@eslint/js"
import jsxA11y from "eslint-plugin-jsx-a11y"
import reactHooks from "eslint-plugin-react-hooks"
import reactPlugin from "eslint-plugin-react"
import ts from "typescript-eslint"

const vitestGlobals = {
  describe: "readonly",
  it: "readonly",
  test: "readonly",
  expect: "readonly",
  vi: "readonly",
  beforeAll: "readonly",
  beforeEach: "readonly",
  afterAll: "readonly",
  afterEach: "readonly"
}

export default ts.config(
  {
    ignores: [".plasmo/**", "build/**", "dist/**", "node_modules/**"]
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat["jsx-runtime"],
  {
    settings: {
      react: {
        version: "detect"
      }
    }
  },
  {
    plugins: {
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules
    }
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true
      }
    }
  },
  {
    files: ["**/*.config.{js,ts,mjs}"],
    languageOptions: {
      globals: {
        module: "readonly",
        require: "readonly",
        __dirname: "readonly"
      }
    }
  },
  {
    files: ["scripts/**/*.{js,mjs}", "scripts/*.{js,mjs}"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly"
      }
    }
  },
  {
    files: ["tests/**/*.ts"],
    languageOptions: {
      globals: vitestGlobals
    }
  }
)
