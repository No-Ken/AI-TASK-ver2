import express from 'express';
import * as cron from 'node-cron';
import { config } from './config';
import { Database } from '@line-secretary/database';
import { logger } from './utils/logger';
import { reminderJob } from './jobs/reminder';
import { dailyNotificationJob } from './jobs/daily-notification';
import { usageResetJob } from './jobs/usage-reset';
import { cleanupJob } from './jobs/cleanup';

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.post('/tasks/reminder', async (req, res) => {
  try {
    await reminderJob.execute();
    res.json({ success: true });
  } catch (error) {
    logger.error('Reminder job failed:', error);
    res.status(500).json({ error: 'Job execution failed' });
  }
});

app.post('/tasks/daily-notification', async (req, res) => {
  try {
    await dailyNotificationJob.execute();
    res.json({ success: true });
  } catch (error) {
    logger.error('Daily notification job failed:', error);
    res.status(500).json({ error: 'Job execution failed' });
  }
});

app.post('/tasks/usage-reset', async (req, res) => {
  try {
    await usageResetJob.execute();
    res.json({ success: true });
  } catch (error) {
    logger.error('Usage reset job failed:', error);
    res.status(500).json({ error: 'Job execution failed' });
  }
});

app.post('/tasks/cleanup', async (req, res) => {
  try {
    await cleanupJob.execute();
    res.json({ success: true });
  } catch (error) {
    logger.error('Cleanup job failed:', error);
    res.status(500).json({ error: 'Job execution failed' });
  }
});

async function startWorker() {
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

    // Schedule jobs
    scheduleJobs();

    const PORT = process.env.PORT || 8081;
    app.listen(PORT, () => {
      logger.info(`Worker started on port ${PORT}`);
    });

  } catch (error) {
    logger.error('Failed to start worker:', error);
    process.exit(1);
  }
}

function scheduleJobs() {
  // Every 5 minutes - Check for reminders
  cron.schedule('*/5 * * * *', async () => {
    try {
      await reminderJob.execute();
    } catch (error) {
      logger.error('Scheduled reminder job failed:', error);
    }
  });

  // Every day at 8:00 AM JST - Send daily notifications
  cron.schedule('0 8 * * *', async () => {
    try {
      await dailyNotificationJob.execute();
    } catch (error) {
      logger.error('Scheduled daily notification job failed:', error);
    }
  }, {
    timezone: 'Asia/Tokyo',
  });

  // First day of month at 00:00 JST - Reset monthly usage
  cron.schedule('0 0 1 * *', async () => {
    try {
      await usageResetJob.execute();
    } catch (error) {
      logger.error('Scheduled usage reset job failed:', error);
    }
  }, {
    timezone: 'Asia/Tokyo',
  });

  // Every day at 2:00 AM JST - Cleanup old data
  cron.schedule('0 2 * * *', async () => {
    try {
      await cleanupJob.execute();
    } catch (error) {
      logger.error('Scheduled cleanup job failed:', error);
    }
  }, {
    timezone: 'Asia/Tokyo',
  });

  logger.info('Scheduled jobs initialized');
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

startWorker();