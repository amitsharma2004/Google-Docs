# Deployment Guide - Render + Vercel

## Overview

- **Backend (Server)**: Deploy to Render
- **Frontend (Client)**: Deploy to Vercel
- **Database**: MongoDB Atlas (cloud)
- **Cache**: Redis Cloud (already configured)

---

## Prerequisites

1. GitHub account with your code pushed
2. Render account (https://render.com)
3. Vercel account (https://vercel.com)
4. MongoDB Atlas account (https://www.mongodb.com/cloud/atlas)
5. Redis Cloud account (already have credentials)

---

## Part 1: Deploy Backend to Render

### Option A: Using render.yaml (Recommended)

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Add deployment configs"
   git push origin main
   ```

2. **Go to Render Dashboard**
   - Visit https://dashboard.render.com
   - Click "New +" → "Blueprint"

3. **Connect Repository**
   - Connect your GitHub account
   - Select your repository
   - Render will detect `render.yaml`

4. **Set Environment Variables**
   
   Click on the service and add these variables:
   
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gdocs?retryWrites=true&w=majority
   CLIENT_ORIGIN=https://your-app.vercel.app
   REDIS_HOST=redis-15656.crce214.us-east-1-3.ec2.cloud.redislabs.com
   REDIS_PORT=15656
   REDIS_USERNAME=default
   REDIS_PASSWORD=9Rl8taYsgTdYA4C3tMlpi12oFaiF8LSc
   ```

5. **Deploy**
   - Click "Apply"
   - Wait for deployment (5-10 minutes)
   - Your backend will be at: `https://gdocs-server.onrender.com`

### Option B: Manual Setup

1. **Create New Web Service**
   - Go to Render Dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**
   ```
   Name: gdocs-server
   Region: Oregon (US West)
   Branch: main
   Root Directory: (leave empty)
   Runtime: Node
   Build Command: cd server && npm install && npm run build
   Start Command: cd server && npm start
   Plan: Free
   ```

3. **Add Environment Variables** (same as above)

4. **Deploy**

---

## Part 2: Deploy Frontend to Vercel

### Option A: Using Vercel CLI (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   # From project root
   vercel
   
   # Follow prompts:
   # - Set up and deploy? Yes
   # - Which scope? Your account
   # - Link to existing project? No
   # - Project name? gdocs-client
   # - Directory? ./
   # - Override settings? No
   ```

4. **Set Environment Variables**
   ```bash
   vercel env add VITE_API_URL production
   # Enter: https://gdocs-server.onrender.com/api
   
   vercel env add VITE_SOCKET_URL production
   # Enter: https://gdocs-server.onrender.com
   ```

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

### Option B: Using Vercel Dashboard

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Click "Add New..." → "Project"

2. **Import Repository**
   - Connect GitHub
   - Select your repository
   - Click "Import"

3. **Configure Project**
   ```
   Framework Preset: Vite
   Root Directory: client
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

4. **Add Environment Variables**
   - Go to Settings → Environment Variables
   - Add:
     ```
     VITE_API_URL=https://gdocs-server.onrender.com/api
     VITE_SOCKET_URL=https://gdocs-server.onrender.com
     ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build (2-5 minutes)
   - Your frontend will be at: `https://your-app.vercel.app`

---

## Part 3: Update Backend with Frontend URL

1. **Go to Render Dashboard**
2. **Select your backend service**
3. **Go to Environment**
4. **Update CLIENT_ORIGIN**
   ```
   CLIENT_ORIGIN=https://your-app.vercel.app
   ```
5. **Save Changes** (will trigger redeploy)

---

## Part 4: MongoDB Atlas Setup

If you don't have MongoDB Atlas set up:

1. **Create Cluster**
   - Go to https://www.mongodb.com/cloud/atlas
   - Create free cluster
   - Choose region close to Render (US West)

2. **Create Database User**
   - Database Access → Add New User
   - Username: `gdocs-user`
   - Password: Generate secure password
   - Role: Read and write to any database

3. **Whitelist IP**
   - Network Access → Add IP Address
   - Add: `0.0.0.0/0` (allow from anywhere)
   - Note: For production, use Render's IP addresses

4. **Get Connection String**
   - Clusters → Connect → Connect your application
   - Copy connection string
   - Replace `<password>` with your password
   - Replace `<dbname>` with `gdocs`

5. **Update Render Environment**
   - Add `MONGODB_URI` with your connection string

---

## Project Structure for Deployment

```
google-docs-clone/
├── client/                    # Frontend (Vercel)
│   ├── dist/                 # Build output (generated)
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── vercel-build.sh       # Vercel build script
├── server/                    # Backend (Render)
│   ├── dist/                 # Build output (generated)
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── render.yaml               # Render configuration
├── vercel.json               # Vercel configuration
└── DEPLOY_GUIDE.md           # This file
```

---

## Build Commands Reference

### Backend (Render)

```bash
# Root Directory: (empty - project root)
# Build Command:
cd server && npm install && npm run build

# Start Command:
cd server && npm start

# What it does:
# 1. Navigate to server directory
# 2. Install dependencies
# 3. Compile TypeScript to JavaScript (dist/)
# 4. Start Node.js server
```

### Frontend (Vercel)

```bash
# Root Directory: client
# Build Command:
npm run build

# Output Directory: dist

# What it does:
# 1. Install dependencies (automatic)
# 2. Compile TypeScript
# 3. Build Vite project
# 4. Output static files to dist/
```

---

## Environment Variables

### Backend (Render)

| Variable | Value | Required |
|----------|-------|----------|
| `NODE_ENV` | `production` | Yes |
| `PORT` | `5000` | Yes |
| `MONGODB_URI` | Your MongoDB connection string | Yes |
| `JWT_SECRET` | Random secure string | Yes |
| `ACCESS_TOKEN_EXPIRY` | `15m` | Yes |
| `REFRESH_TOKEN_EXPIRY` | `7d` | Yes |
| `CLIENT_ORIGIN` | Your Vercel URL | Yes |
| `REDIS_HOST` | Redis host | Yes |
| `REDIS_PORT` | `15656` | Yes |
| `REDIS_USERNAME` | `default` | Yes |
| `REDIS_PASSWORD` | Your Redis password | Yes |
| `LOG_LEVEL` | `info` | No |

### Frontend (Vercel)

| Variable | Value | Required |
|----------|-------|----------|
| `VITE_API_URL` | `https://your-backend.onrender.com/api` | Yes |
| `VITE_SOCKET_URL` | `https://your-backend.onrender.com` | Yes |

---

## Post-Deployment Checklist

### Backend

- [ ] Service is running (green status)
- [ ] Health check passes: `https://your-backend.onrender.com/health`
- [ ] API responds: `https://your-backend.onrender.com/api`
- [ ] MongoDB connected (check logs)
- [ ] Redis connected (check logs)
- [ ] CORS configured with frontend URL

### Frontend

- [ ] Build successful
- [ ] Site loads: `https://your-app.vercel.app`
- [ ] Can access login page
- [ ] Environment variables set correctly
- [ ] API calls work (check Network tab)
- [ ] Socket.IO connects (check Console)

### Integration

- [ ] Can register new user
- [ ] Can login
- [ ] Can create document
- [ ] Can edit document
- [ ] Real-time collaboration works
- [ ] Share link works

---

## Troubleshooting

### Backend Issues

**Build fails:**
```bash
# Check build logs in Render
# Common issues:
# - Missing dependencies
# - TypeScript errors
# - Wrong Node version

# Fix: Ensure package.json has all dependencies
```

**Service crashes:**
```bash
# Check logs in Render Dashboard
# Common issues:
# - MongoDB connection failed
# - Redis connection failed
# - Missing environment variables

# Fix: Verify all environment variables are set
```

**CORS errors:**
```bash
# Error: "Access-Control-Allow-Origin"
# Fix: Update CLIENT_ORIGIN in Render to match Vercel URL
```

### Frontend Issues

**Build fails:**
```bash
# Check build logs in Vercel
# Common issues:
# - TypeScript errors
# - Missing dependencies
# - Wrong build command

# Fix: Test build locally first
cd client
npm run build
```

**API calls fail:**
```bash
# Error: "Failed to fetch"
# Fix: Check VITE_API_URL is correct
# Should be: https://your-backend.onrender.com/api
```

**Socket.IO doesn't connect:**
```bash
# Error: "WebSocket connection failed"
# Fix: Check VITE_SOCKET_URL is correct
# Should be: https://your-backend.onrender.com
```

### Database Issues

**MongoDB connection fails:**
```bash
# Error: "MongoNetworkError"
# Fix:
# 1. Check connection string is correct
# 2. Verify IP whitelist includes 0.0.0.0/0
# 3. Check database user has correct permissions
```

**Redis connection fails:**
```bash
# Error: "Redis connection error"
# Fix:
# 1. Verify Redis credentials
# 2. Check Redis host and port
# 3. Ensure Redis Cloud instance is active
```

---

## Monitoring

### Render

- **Logs**: Dashboard → Your Service → Logs
- **Metrics**: Dashboard → Your Service → Metrics
- **Events**: Dashboard → Your Service → Events

### Vercel

- **Deployments**: Dashboard → Your Project → Deployments
- **Analytics**: Dashboard → Your Project → Analytics
- **Logs**: Dashboard → Your Project → Logs

### MongoDB Atlas

- **Metrics**: Clusters → Metrics
- **Logs**: Clusters → Logs
- **Alerts**: Alerts → Create Alert

---

## Updating Deployments

### Backend (Render)

```bash
# Automatic deployment on git push
git add .
git commit -m "Update backend"
git push origin main

# Render will automatically detect and deploy
```

### Frontend (Vercel)

```bash
# Automatic deployment on git push
git add .
git commit -m "Update frontend"
git push origin main

# Vercel will automatically detect and deploy
```

### Manual Deployment

```bash
# Backend: Trigger manual deploy in Render Dashboard
# Frontend: Run vercel --prod
```

---

## Cost Estimate

### Free Tier

- **Render**: Free (with limitations)
  - 750 hours/month
  - Spins down after 15 min inactivity
  - Slower cold starts

- **Vercel**: Free
  - 100 GB bandwidth/month
  - Unlimited deployments
  - Fast CDN

- **MongoDB Atlas**: Free
  - 512 MB storage
  - Shared cluster
  - Good for development

- **Redis Cloud**: Free
  - 30 MB storage
  - Good for development

**Total: $0/month** for development/testing

### Paid Tier (Recommended for Production)

- **Render**: $7/month
  - Always on
  - Faster performance
  - More resources

- **Vercel**: $20/month (Pro)
  - More bandwidth
  - Better analytics
  - Team features

- **MongoDB Atlas**: $9/month (M2)
  - 2 GB storage
  - Better performance
  - Automated backups

- **Redis Cloud**: $5/month
  - 250 MB storage
  - Better performance

**Total: ~$41/month** for production

---

## Security Checklist

- [ ] JWT_SECRET is strong and random
- [ ] MongoDB user has minimal permissions
- [ ] Redis password is secure
- [ ] CORS is configured correctly
- [ ] HTTPS is enabled (automatic on Render/Vercel)
- [ ] Environment variables are not in code
- [ ] API rate limiting enabled (TODO)
- [ ] Input validation on all endpoints
- [ ] MongoDB IP whitelist configured

---

## Next Steps

1. Deploy backend to Render
2. Deploy frontend to Vercel
3. Test all functionality
4. Set up custom domain (optional)
5. Configure monitoring and alerts
6. Set up automated backups
7. Add rate limiting
8. Implement analytics

---

## Support

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com
- **Redis Cloud Docs**: https://docs.redis.com/latest/rc/

---

## Summary

Your app is now deployed! 🎉

- **Frontend**: https://your-app.vercel.app
- **Backend**: https://gdocs-server.onrender.com
- **Health Check**: https://gdocs-server.onrender.com/health

Users can now access your Google Docs clone from anywhere!
