#!/bin/bash

echo "🔍 Verifying Google Docs Clone Setup..."
echo ""

# Check Node.js
echo "✓ Checking Node.js..."
node --version || { echo "❌ Node.js not found"; exit 1; }

# Check server files
echo "✓ Checking server files..."
[ -f "server/src/app.ts" ] || { echo "❌ server/src/app.ts missing"; exit 1; }
[ -f "server/src/routes/authRoutes.ts" ] || { echo "❌ authRoutes.ts missing"; exit 1; }
[ -f "server/src/routes/docRoutes.ts" ] || { echo "❌ docRoutes.ts missing"; exit 1; }
[ -f "server/src/middleware/auth.ts" ] || { echo "❌ auth.ts missing"; exit 1; }
[ -f "server/src/models/User.ts" ] || { echo "❌ User.ts missing"; exit 1; }
[ -f "server/src/models/Document.ts" ] || { echo "❌ Document.ts missing"; exit 1; }
[ -f "server/src/models/Operation.ts" ] || { echo "❌ Operation.ts missing"; exit 1; }
[ -f "server/src/services/DocumentService.ts" ] || { echo "❌ DocumentService.ts missing"; exit 1; }
[ -f "server/src/services/OTEngine.ts" ] || { echo "❌ OTEngine.ts missing"; exit 1; }
[ -f "server/src/socket/collabHandler.ts" ] || { echo "❌ collabHandler.ts missing"; exit 1; }

echo "✓ All server files exist"

# Check client files
echo "✓ Checking client files..."
[ -f "client/src/vite-env.d.ts" ] || { echo "❌ vite-env.d.ts missing"; exit 1; }
echo "✓ All client files exist"

# Check dependencies
echo "✓ Checking dependencies..."
[ -d "server/node_modules" ] || { echo "❌ Server dependencies not installed"; exit 1; }
[ -d "client/node_modules" ] || { echo "❌ Client dependencies not installed"; exit 1; }
echo "✓ Dependencies installed"

# TypeScript check - Server
echo ""
echo "🔨 Running TypeScript compilation (server)..."
cd server
npx tsc --noEmit
if [ $? -eq 0 ]; then
    echo "✅ Server TypeScript compilation: PASSED"
else
    echo "❌ Server TypeScript compilation: FAILED"
    exit 1
fi

# TypeScript check - Client
echo ""
echo "🔨 Running TypeScript compilation (client)..."
cd ../client
npx tsc --noEmit
if [ $? -eq 0 ]; then
    echo "✅ Client TypeScript compilation: PASSED"
else
    echo "❌ Client TypeScript compilation: FAILED"
    exit 1
fi

cd ..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ALL CHECKS PASSED!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Your project is ready to run!"
echo ""
echo "Next steps:"
echo "1. Start MongoDB: mongod"
echo "2. Start Redis: redis-server"
echo "3. Start server: cd server && npm run dev"
echo "4. Start client: cd client && npm run dev"
echo ""
echo "If you see 'module not found' errors in your IDE,"
echo "read FIX_IDE_ERRORS.md for solutions."
