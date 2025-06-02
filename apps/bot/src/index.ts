import express from 'express';
import { middleware, MiddlewareConfig, WebhookEvent } from '@line/bot-sdk';
import { config } from './config';
import { handleEvent } from './handlers';
import { Database } from '@line-secretary/database';
import { logger } from './utils/logger';

const app = express();

const middlewareConfig: MiddlewareConfig = {
  channelAccessToken: config.line.channelAccessToken,
  channelSecret: config.line.channelSecret,
};

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/webhook', middleware(middlewareConfig), async (req, res) => {
  try {
    const events: WebhookEvent[] = req.body.events;
    
    await Promise.all(events.map(handleEvent));
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function startBot() {
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

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
      logger.info(`Bot server is running on port ${PORT}`);
    });

  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

startBot();