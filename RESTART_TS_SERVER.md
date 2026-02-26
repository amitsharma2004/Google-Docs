# How to Fix "Cannot find module" Errors

## Quick Fix (Choose one method)

### Method 1: Restart TypeScript Server in VS Code/Kiro
1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type: `TypeScript: Restart TS Server`
3. Press Enter
4. Wait 5-10 seconds for the server to restart

### Method 2: Reload Window
1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type: `Developer: Reload Window`
3. Press Enter

### Method 3: Close and Reopen
1. Close your IDE completely
2. Reopen the project
3. Wait for TypeScript to initialize

### Method 4: Delete TypeScript Cache
```bash
# Run these commands:
cd server
rm -rf node_modules/.cache
rm -f tsconfig.tsbuildinfo

# Then restart your IDE
```

## Verify It's Fixed

After restarting, the red squiggly lines should disappear. If they don't:

1. Check the TypeScript version in the bottom-right of VS Code
2. Make sure it says "TypeScript 5.9.3" (not a different version)
3. Click on it and select "Use Workspace Version"

## Proof Your Code Works

Run this to prove there are no actual errors:

```bash
cd server
npx tsc --noEmit
```

If this command exits with no output, your code is perfect! The IDE just needs to catch up.

## Why This Happens

When files are created programmatically (not through the IDE), the TypeScript language server's cache can become stale. This is a known issue with all TypeScript-aware editors. The actual TypeScript compiler works fine - it's just the IDE's real-time checker that's confused.

## Still Having Issues?

Try this nuclear option:

```bash
# Delete everything and reinstall
cd server
rm -rf node_modules package-lock.json
npm install

# Restart your IDE
```

Then restart the TypeScript server using Method 1 above.
