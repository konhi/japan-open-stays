# Task 01: Monorepo Setup + Code Quality Tools

## Goal

Set up the monorepo structure with pnpm workspaces and configure all code quality tools (ESLint 9, Prettier, Knip, Husky).

## Implementation Steps

### 1. Initialize pnpm Workspace

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'infrastructure'
```

Create root `package.json`:

```json
{
  "name": "japan-open-stays",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter web dev",
    "build": "pnpm -r build",
    "lint": "eslint .",
    "format": "prettier --write .",
    "type-check": "pnpm -r exec tsc --noEmit",
    "knip": "knip"
  }
}
```

### 2. ESLint 9 (Flat Config)

Install dependencies:

```bash
pnpm add -D -w eslint @eslint/js typescript typescript-eslint eslint-plugin-react-compiler eslint-config-prettier
```

Create `eslint.config.mjs`:

```javascript
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

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
  }
)
```

### 3. Prettier

Install:

```bash
pnpm add -D -w prettier
```

Create `.prettierrc`:

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

### 4. Knip

Install:

```bash
pnpm add -D -w knip
```

Create `knip.json`:

```json
{
  "workspaces": {
    ".": {
      "entry": ["apps/*/src/main.ts", "apps/web/app/**/*.tsx"]
    }
  }
}
```

### 5. Husky Pre-commit Hooks

Install and initialize:

```bash
pnpm add -D -w husky
npx husky init
```

Create `.husky/pre-commit`:

```bash
#!/bin/sh
pnpm exec tsc --noEmit
pnpm exec eslint --fix .
pnpm exec prettier --write .
pnpm exec knip
```

### 6. Create Directory Structure

// add .gitkeep

```
japan-open-stays/
├── apps/
│   ├── web/               # (will be created in task 08)
│   ├── api/               # (will be created in task 04)
│   └── scraper/           # (will be created in task 06)
├── packages/
│   └── types/             # (will be created in task 02)
├── infrastructure/        # (will be created in task 03)
├── pnpm-workspace.yaml
├── package.json
├── eslint.config.mjs
├── .prettierrc
├── knip.json
└── .husky/pre-commit
```

### 7. Root TypeScript Config

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
    // also add the one about unchecked index access
  }
}
```

## Verification

- [ ] `pnpm install` works
- [ ] `pnpm lint` runs without errors
- [ ] `pnpm format` formats all files
- [ ] `pnpm knip` detects no issues
- [ ] Git pre-commit hook runs all checks

## Dependencies

None - this is the foundation task.

## Next Task

Task 02: Define shared TypeScript types
