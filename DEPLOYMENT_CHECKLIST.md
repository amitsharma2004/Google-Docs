# Deployment Checklist

## Pre-Deployment

- [ ] All code committed to GitHub
- [ ] `.env` files are in `.gitignore`
- [ ] MongoDB Atlas cluster created
- [ ] Redis Cloud instance active
- [ ] All tests passing locally

## Backend Deployment (Render)

- [ ] Create Render account
- [ ] Connect GitHub repository
- [ ] Configure service:
  - Root Directory: (empty)
  - Build Command: `cd server && npm install && npm run build`
  - Start Command: `cd server && npm start`
- [ ] Set environment variables:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=5000`
  - [ ] `MONGODB_URI=<your-mongodb-uri>`
  - [ ] `JWT_SECRET=<random-secure-string>`
  - [ ] `ACCESS_TOKEN_EXPIRY=15m`
  - [ ] `REFRESH_TOKEN_EXPIRY=7d`
  - [ ] `CLIENT_ORIGIN=<your-vercel-url>`
  - [ ] `REDIS_HOST=<your-redis-host>`
  - [ ] `REDIS_PORT=15656`
  - [ ] `REDIS_USERNAME=default`
  - [ ] `REDIS_PASSWORD=<your-redis-password>`
  - [ ] `LOG_LEVEL=info`
- [ ] Deploy service
- [ ] Verify health check: `/health`
- [ ] Check logs for errors

## Frontend Deployment (Vercel)

- [ ] Create Vercel account
- [ ] Install Vercel CLI: `npm install -g vercel`
- [ ] Login: `vercel login`
- [ ] Configure project:
  - Root Directory: `client`
  - Build Command: `npm run build`
  - Output Directory: `dist`
- [ ] Set environment variables:
  - [ ] `VITE_API_URL=https://your-backend.onrender.com/api`
  - [ ] `VITE_SOCKET_URL=https://your-backend.onrender.com`
- [ ] Deploy: `vercel --prod`
- [ ] Verify site loads
- [ ] Check browser console for errors

## Post-Deployment

- [ ] Update `CLIENT_ORIGIN` in Render with Vercel URL
- [ ] Test user registration
- [ ] Test user login
- [ ] Test document creation
- [ ] Test document editing
- [ ] Test real-time collaboration
- [ ] Test share link feature
- [ ] Test on mobile device
- [ ] Set up custom domain (optional)
- [ ] Configure monitoring
- [ ] Set up error tracking (Sentry)

## URLs to Save

```
Frontend: https://your-app.vercel.app
Backend: https://gdocs-server.onrender.com
Health Check: https://gdocs-server.onrender.com/health
API: https://gdocs-server.onrender.com/api
```

## Quick Commands

```bash
# Deploy backend (automatic on git push)
git push origin main

# Deploy frontend
vercel --prod

# Check backend logs
# Go to Render Dashboard → Logs

# Check frontend logs
vercel logs

# Test health endpoint
curl https://gdocs-server.onrender.com/health
```
