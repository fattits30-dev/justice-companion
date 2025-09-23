# 🚀 Cursor Shortcuts for Justice Companion

## Essential Keyboard Shortcuts

### AI Features
- **Cmd/Ctrl + L** - Open AI Chat
- **Cmd/Ctrl + K** - AI Edit selected code
- **Tab** - Accept Copilot++ suggestion
- **Esc** - Reject suggestion

## Quick Commands for Your Project

### Fix TypeScript Errors
1. Open `ChatInterface.tsx`
2. Select all (Cmd/Ctrl + A)
3. Cmd/Ctrl + K: "Fix all TypeScript errors and add proper types"

### Refactor Large Files
1. Open `EnhancedCaseManager.js`
2. Cmd/Ctrl + K: "Split this into 3 modules: CaseCreation, CaseMonitoring, CaseStorage"

### Convert JS to TypeScript
1. Open any `.js` file
2. Cmd/Ctrl + K: "Convert this to TypeScript with proper types"

### Generate Tests
1. Open a component
2. Cmd/Ctrl + K: "Generate Jest tests for this component"

## Useful Terminal Commands

```bash
# Format all files
npm run format

# Fix all auto-fixable issues
npm run lint:fix

# Check TypeScript types
npm run type-check

# Run everything
npm run lint && npm run format && npm run type-check
```

## AI Chat Prompts

Use these in Cmd/Ctrl + L:

- `@codebase Find all unused components`
- `@codebase What files are over 400 lines?`
- `@file Add proper error handling to this component`
- `Fix the TypeScript error: [paste error]`
- `Optimize this component for performance`

## Cursor Settings

Already configured in `.vscode/settings.json`:
- Auto-format on save ✅
- Auto-organize imports ✅
- Auto-fix ESLint issues ✅
- Hide backup/debug files ✅

## Pro Tips

1. **Multi-cursor editing**: Alt + Click
2. **Find all references**: Right-click → Find All References
3. **Rename symbol**: F2 on any variable/function
4. **Quick Fix**: Cmd/Ctrl + . on any error
5. **Go to Definition**: Cmd/Ctrl + Click

## Quick Fixes for Common Issues

### "Module not found" error
```
Cmd/Ctrl + K: "Fix the import path"
```

### Large component
```
Cmd/Ctrl + K: "Extract this JSX into a separate component"
```

### Missing types
```
Cmd/Ctrl + K: "Add TypeScript types to all function parameters"
```

Happy coding! 🎉