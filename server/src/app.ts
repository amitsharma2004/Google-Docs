/**
 * app.ts — Express application factory.
 * Wires together: REST routes, Socket.io, Redis, MongoDB.
 * Auth and Collaboration are co-located here (monolithic, per ADR-001).
 */

import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import { Server as SocketServer } from 'socket.io';
import Redis from 'ioredis';

import authRoutes from './routes/authRoutes';
import docRoutes  from './routes/docRoutes';
import { socketAuthenticate } from './middleware/auth';
import { registerCollabHandlers } from './socket/collabHandler';
import logger from './utils/logger';
import { requestLogger } from './middleware/requestLogger';

export async function createApp() {
  // ── Express setup ─────────────────────────────────────────────────────
  const app  = express();
  const httpServer = http.createServer(app);

  app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173', credentials: true }));
  app.use(express.json());
  app.use(requestLogger); // Log all incoming requests

  // ── REST Routes ───────────────────────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/docs', docRoutes);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // ── MongoDB ───────────────────────────────────────────────────────────
  const mongoUri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/gdocs';
  await mongoose.connect(mongoUri);
  
  const mongoHost = mongoose.connection.host;
  const mongoDb = mongoose.connection.name;
  logger.info(`MongoDB connected: ${mongoHost}/${mongoDb}`);

  // ── Redis ─────────────────────────────────────────────────────────────
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const redis = new Redis(redisUrl);
  
  redis.on('error', (err) => logger.error(`Redis connection error: ${err.message}`));
  redis.on('connect', () => {
    const redisHost = redis.options.host;
    const redisPort = redis.options.port;
    logger.info(`Redis connected: ${redisHost}:${redisPort}`);
  });

  // ── Socket.io ─────────────────────────────────────────────────────────
  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // JWT auth on every socket connection (monolithic guard)
  io.use(socketAuthenticate);

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.data.userId})`);
    registerCollabHandlers(io, socket, redis);
  });

  return { app, httpServer, io, redis };
}