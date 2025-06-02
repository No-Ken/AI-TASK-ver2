import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { Database } from '@line-secretary/database';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';
import { warikanRoutes } from './routes/warikan';
import { scheduleRoutes } from './routes/schedule';
import { userRoutes } from './routes/user';
import memoRoutes from './routes/memo.routes';
import { logger } from './utils/logger';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API routes
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/warikan', authMiddleware, warikanRoutes);
app.use('/api/schedule', authMiddleware, scheduleRoutes);
app.use('/api/memos', memoRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

async function startServer() {
  try {
    // Initialize database
    Database.initialize({
      projectId: config.firebase.projectId,
      keyFilename: config.firebase.credentialsPath,
      emulator: config.env === 'development' ? {
        host: 'localhost',
        port: 8090,
      } : undefined,
    });

    const PORT = config.port;
    app.listen(PORT, () => {
      logger.info(`LIFF API server is running on port ${PORT}`);
    });

  } catch (error) {
    logger.error('Failed to start LIFF API server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

startServer();