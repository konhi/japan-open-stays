import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactCompilerPlugin from 'eslint-plugin-react-compiler'
import prettierConfig from 'eslint-config-prettier'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-compiler': reactCompilerPlugin,
    },
    rules: {
      'react-compiler/react-compiler': 'error',
    },
  },
  prettierConfig
)
