import { WebhookEvent, Client, TextMessage } from '@line/bot-sdk';
import { config } from '../config';
import { logger } from '../utils/logger';
import { messageHandler } from './message';
import { postbackHandler } from './postback';
import { followHandler } from './follow';

const client = new Client({
  channelAccessToken: config.line.channelAccessToken,
});

export async function handleEvent(event: WebhookEvent): Promise<void> {
  try {
    logger.info('Received event:', { type: event.type, source: event.source });
    
    switch (event.type) {
      case 'message':
        await messageHandler(client, event);
        break;
        
      case 'postback':
        await postbackHandler(client, event);
        break;
        
      case 'follow':
        await followHandler(client, event);
        break;
        
      case 'unfollow':
        logger.info('User unfollowed:', { userId: event.source.userId });
        break;
        
      default:
        logger.warn('Unhandled event type:', { type: event.type });
    }
  } catch (error) {
    logger.error('Error handling event:', error);
    
    if (event.type === 'message' && event.replyToken) {
      const errorMessage: TextMessage = {
        type: 'text',
        text: '申し訳ございません。エラーが発生しました。しばらくしてからもう一度お試しください。',
      };
      
      try {
        await client.replyMessage(event.replyToken, errorMessage);
      } catch (replyError) {
        logger.error('Failed to send error message:', replyError);
      }
    }
  }
}