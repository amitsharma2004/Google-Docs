# Quick Deploy Commands

## 1. Prepare for Deployment

```bash
# Make sure all changes are committed
git add .
git commit -m "Ready for deployment"
git push origin main
```

## 2. Deploy Backend to Render

### Using Render Dashboard (Easiest)

1. Go to https://dashboard.render.com
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will detect `render.yaml` and configure automatically
5. Add environment variables (see below)
6. Click "Apply"

### Environment Variables for Render

```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gdocs
JWT_SECRET=your-super-secret-key-min-32-chars
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
CLIENT_ORIGIN=https://your-app.vercel.app
REDIS_HOST=redis-15656.crce214.us-east-1-3.ec2.cloud.redislabs.com
REDIS_PORT=15656
REDIS_USERNAME=default
REDIS_PASSWORD=9Rl8taYsgTdYA4C3tMlpi12oFaiF8LSc
LOG_LEVEL=info
```

## 3. Deploy Frontend to Vercel

### Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (from project root)
vercel

# Answer prompts:
# Set up and deploy? Y
# Which scope? (select your account)
# Link to existing project? N
# Project name? gdocs-client
# Directory? ./
# Override settings? N

# Add environment variables
vercel env add VITE_API_URL production
# Enter: https://your-backend.onrender.com/api

vercel env add VITE_SOCKET_URL production
# Enter: https://your-backend.onrender.com

# Deploy to production
vercel --prod
```

### Using Vercel Dashboard (Alternative)

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure:
   - Framework: Vite
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add environment variables:
   - `VITE_API_URL`: `https://your-backend.onrender.com/api`
   - `VITE_SOCKET_URL`: `https://your-backend.onrender.com`
6. Click "Deploy"

## 4. Update Backend with Frontend URL

```bash
# After Vercel deployment, you'll get a URL like:
# https://gdocs-client-abc123.vercel.app

# Go to Render Dashboard
# Select your backend service
# Go to Environment
# Update CLIENT_ORIGIN to your Vercel URL
# Save (will trigger redeploy)
```

## 5. Test Deployment

```bash
# Test backend health
curl https://your-backend.onrender.com/health

# Should return:
# {"status":"ok","timestamp":"...","uptime":123,"environment":"production"}

# Test frontend
# Open: https://your-app.vercel.app
# Should see login page
```

## 6. Verify Everything Works

1. Open frontend URL
2. Register a new user
3. Login
4. Create a document
5. Edit the document
6. Share the document
7. Open in another browser/incognito
8. Test real-time collaboration

## Troubleshooting

### Backend not starting

```bash
# Check Render logs
# Common issues:
# - MongoDB connection failed → Check MONGODB_URI
# - Redis connection failed → Check Redis credentials
# - Missing environment variables → Add them in Render dashboard
```

### Frontend not loading

```bash
# Check Vercel deployment logs
# Common issues:
# - Build failed → Check for TypeScript errors
# - API calls failing → Check VITE_API_URL is correct
# - Socket not connecting → Check VITE_SOCKET_URL is correct
```

### CORS errors

```bash
# Error: "Access-Control-Allow-Origin"
# Fix: Update CLIENT_ORIGIN in Render to match your Vercel URL exactly
# Example: https://gdocs-client-abc123.vercel.app (no trailing slash)
```

## File Structure Summary

```
Project Root/
├── client/                    → Deploy to Vercel
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── server/                    → Deploy to Render
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── render.yaml               → Render configuration
├── vercel.json               → Vercel configuration
└── QUICK_DEPLOY.md           → This file
```

## Build Commands Reference

| Platform | Root Dir | Build Command | Start Command |
|----------|----------|---------------|---------------|
| **Render** | (empty) | `cd server && npm install && npm run build` | `cd server && npm start` |
| **Vercel** | `client` | `npm run build` | (static files) |

## Important URLs

After deployment, save these URLs:

```
Frontend: https://your-app.vercel.app
Backend: https://your-backend.onrender.com
API: https://your-backend.onrender.com/api
Health: https://your-backend.onrender.com/health
```

## Next Deployment (Updates)

```bash
# Just push to GitHub - both will auto-deploy!
git add .
git commit -m "Update feature"
git push origin main

# Render and Vercel will automatically detect and deploy
```

## Cost

- **Free Tier**: $0/month (with limitations)
- **Paid Tier**: ~$41/month (recommended for production)

## Done! 🎉

Your Google Docs clone is now live and accessible worldwide!
