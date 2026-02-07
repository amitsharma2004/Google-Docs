import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import globalErrorHandler from './src/middleware/errorHandler.js';
import logger from './src/utils/logger.js';
import { dbConnect } from './src/config/ConnectToDB.js';
// import corsOptions from './src/utils/cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Google Docs API is running!' });
});

// Global error handler (must be last)
app.use(globalErrorHandler);

// Connect to database and start server
const startServer = async () => {
  try {
    await dbConnect();
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
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