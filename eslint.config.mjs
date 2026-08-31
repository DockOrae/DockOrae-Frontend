// ESLint 扁平配置(ESLint 9+)
// 说明:保持 .mjs 而非 .ts —— ESLint 官方加载机制对 TS 配置文件依赖 jiti,
// .mjs 是零依赖的稳定形态(技能规范允许配置文件保留 JS/MJS)。
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'src-backup-*/**', 'shots/**', 'scripts/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
      },
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      // shadcn-vue 组件名约定(单文件组件命名)
      'vue/multi-word-component-names': 'off',
      // 模板风格规则与项目现有排版不一致,关闭
      'vue/max-attributes-per-line': 'off',
      'vue/html-indent': 'off',
      'vue/html-self-closing': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/attributes-order': 'off',
      'vue/require-default-prop': 'off',
      // 事件参数类型由 vue-tsc 保证
      'vue/no-v-html': 'off',
      // 现有代码习惯(console 调试可保留;业务代码无 console)
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
)
