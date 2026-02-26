# Quick Start Guide

## Prerequisites Check

Make sure you have these installed:
- Node.js v18+ (`node --version`)
- MongoDB v6+ (`mongod --version`)
- Redis v7+ (`redis-server --version`)

## Setup Steps

### 1. Dependencies are already installed ✅

### 2. Configure Environment Variables

The `.env` files have been created from examples. Update them if needed:

**server/.env**
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/gdocs
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_jwt_key_here  # ⚠️ Change this!
CLIENT_ORIGIN=http://localhost:5173
```

**client/.env**
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Start Required Services

#### MongoDB
```bash
# Windows (if installed as service)
net start MongoDB

# Or start manually
mongod

# macOS/Linux
brew services start mongodb-community
# or
sudo systemctl start mongod
```

#### Redis
```bash
# Windows (WSL or Redis for Windows)
redis-server

# macOS
brew services start redis

# Linux
sudo systemctl start redis
```

### 4. Start the Application

Open two terminal windows:

**Terminal 1 - Server:**
```bash
cd server
npm run dev
```
Server runs on http://localhost:5000

**Terminal 2 - Client:**
```bash
cd client
npm run dev
```
Client runs on http://localhost:5173

### 5. Open the App

Navigate to http://localhost:5173 in your browser

## First Time Usage

1. Click "Register" to create an account
2. Login with your credentials
3. Create a new document
4. Start editing!
5. Share the URL with others to collaborate in real-time

## Troubleshooting

### MongoDB not connecting?
- Check if MongoDB is running: `mongod --version`
- Verify the connection string in `server/.env`

### Redis not connecting?
- Check if Redis is running: `redis-cli ping` (should return PONG)
- Verify the Redis URL in `server/.env`

### Port already in use?
- Change PORT in `server/.env`
- Update VITE_API_URL and VITE_SOCKET_URL in `client/.env` accordingly

### TypeScript errors in IDE?
- Restart your TypeScript server
- The code compiles successfully (`npm run build` works)

## Development Commands

```bash
# Type check
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit

# Build for production
cd server && npm run build
cd client && npm run build

# Start production build
cd server && npm start
```

## Architecture Overview

- **Frontend**: React + TypeScript + Vite + Redux Toolkit + Quill Editor
- **Backend**: Node.js + Express + TypeScript + Socket.IO
- **Database**: MongoDB (documents) + Redis (sessions/locks)
- **Real-time**: WebSocket with Operational Transformation (OT)

## Next Steps

- Customize the editor toolbar in `client/src/components/Editor.tsx`
- Add more document permissions in `server/src/routes/docRoutes.ts`
- Implement user presence indicators
- Add document sharing features
