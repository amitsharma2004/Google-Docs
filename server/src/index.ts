/**
 * index.ts — Server entry point.
 */

import 'dotenv/config';
import { createApp } from './app';
import logger from './utils/logger';

const PORT = Number(process.env.PORT ?? 5000);

(async () => {
  try {
    const { httpServer } = await createApp();
    httpServer.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
})();