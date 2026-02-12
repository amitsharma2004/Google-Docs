import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import corsMiddleware from './src/utils/cors.js';
import globalErrorHandler from './src/middleware/errorHandler.js';
import logger from './src/utils/logger.js';
import { dbConnect } from './src/config/ConnectToDB.js';
import userRoutes from './src/routes/userRoutes.js';
import commentRoutes from './src/routes/commentRoutes.js';
import { SocketServer } from './src/services/websocket/socketServer.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const httpServer = http.createServer(app);

// Middleware
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Google Docs API is running!' });
});

app.use('/api/users', userRoutes);
app.use('/api', commentRoutes);

// Global error handler (must be last)
app.use(globalErrorHandler);

// Connect to database and start server
const startServer = async () => {
  try {
    await dbConnect();
    
    // Initialize WebSocket server
    new SocketServer(httpServer);
    
    httpServer.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`WebSocket server is ready`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

process.on('SIGINT', () => {
  logger.info('Gracefully shutting down');
  process.exit(0);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});