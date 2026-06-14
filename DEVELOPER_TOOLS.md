# Developer Quality of Life (QoL) Tools

This document describes the developer tools and best practices configured for this project.

## 🛠️ Tools Installed

### ESLint

**Purpose:** Catch bugs and enforce code quality standards before deployment

**Configuration:** `eslint.config.js` (ESLint v10 flat config)

**Features:**

- JavaScript/TypeScript linting
- Vue 3 specific rules
- TypeScript strict mode integration
- Automatic fixable issues with `--fix` flag

**Usage:**

```bash
npm run lint          # Check for linting errors
npm run lint:fix      # Auto-fix fixable issues
```

### Prettier

**Purpose:** Automatic code formatting for consistent style

**Configuration:** `.prettierrc`

**Features:**

- Single quotes, no semicolons
- 100 character line width
- Consistent formatting across the team

**Usage:**

```bash
npm run format        # Format all code
npm run format:check  # Check if code is formatted
```

### TypeScript Type Checking

**Purpose:** Catch type errors before deployment

**Usage:**

```bash
npm run type-check    # Run TypeScript compiler without emitting files
```

### Pre-Deployment Checks

**Purpose:** Run all checks before deployment to catch issues early

**Usage:**

```bash
npm run pre-deploy    # Runs format:check, lint, and type-check
```

This command is automatically run by the deployment script (`scripts/deploy.sh`) before deploying to production.

### Docker Environment Management

**Purpose:** Easily manage local Docker development environment

**Usage:**

```bash
npm run docker:setup    # First-time setup of local Docker environment
npm run docker:up       # Start Docker containers in detached mode
npm run docker:down     # Stop and remove Docker containers
npm run docker:logs     # View real-time logs from all containers
npm run docker:restart  # Restart Docker containers
```

These scripts work with the `local-dev/` directory structure. For more details, see [local-dev/README.md](local-dev/README.md).

## 📝 VS Code Integration

The following VS Code extensions are recommended (see `.vscode/extensions.json`):

- **ESLint** - Real-time linting
- **Prettier** - Format on save
- **Volar** - Vue 3 language support
- **TypeScript Vue Plugin** - TypeScript support in Vue files

The workspace settings (`.vscode/settings.json`) are configured to:

- Format on save using Prettier
- Auto-fix ESLint issues on save
- Use proper TypeScript SDK

## 🚀 Deployment Integration

The deployment script (`scripts/deploy.sh`) now includes pre-deployment checks:

1. **Format Check** - Ensures code is properly formatted
2. **Lint** - Checks for code quality issues
3. **Type Check** - Validates TypeScript types
4. **Build** - Only proceeds if all checks pass

If any check fails, deployment is aborted with helpful error messages.

## 🔧 Configuration Files

- `eslint.config.js` - ESLint configuration (flat config format)
- `.prettierrc` - Prettier formatting rules
- `.prettierignore` - Files to exclude from formatting
- `.vscode/settings.json` - VS Code workspace settings
- `.vscode/extensions.json` - Recommended VS Code extensions

## 💡 Best Practices

### Before Committing

```bash
npm run format        # Format your code
npm run lint:fix      # Fix auto-fixable issues
npm run type-check    # Verify no type errors
```

### During Development

- Let VS Code auto-format on save
- Pay attention to ESLint warnings/errors in the editor
- Fix type errors as they appear

### Before Deployment

The deployment script automatically runs `npm run pre-deploy`, but you can run it manually:

```bash
npm run pre-deploy
```

## 📊 Current Status

After initial setup:

- ✅ ESLint configured and working
- ✅ Prettier configured and working
- ✅ TypeScript strict mode enabled
- ✅ VS Code integration configured
- ✅ Deployment checks integrated
- ⚠️ 7 warnings about single-word component names (acceptable for views)

## 🎯 Addressing Warnings

The remaining ESLint warnings about single-word component names in views (About, Cart, Contact, etc.) are acceptable because:

1. These are page/view components, not reusable components
2. Vue.js allows single-word names for top-level views
3. They don't cause any functional issues

To suppress these warnings in specific files, you can add:

```vue
<!-- eslint-disable-next-line vue/multi-word-component-names -->
```

Or update the ESLint config to disable this rule for the `views/` folder.

## 🔍 Finding Issues Early

These tools help catch:

- **Syntax errors** before runtime
- **Type mismatches** before they cause bugs
- **Code style inconsistencies** automatically
- **Common Vue.js mistakes** early in development
- **Unused variables** and dead code
- **Missing dependencies** in effect hooks
- **Accessibility issues** in templates

## 📚 Resources

- [ESLint Documentation](https://eslint.org/)
- [Prettier Documentation](https://prettier.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vue 3 Style Guide](https://vuejs.org/style-guide/)
- [ESLint Plugin Vue](https://eslint.vuejs.org/)
