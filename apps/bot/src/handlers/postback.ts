import { Client, PostbackEvent, TextMessage } from '@line/bot-sdk';
import { logger } from '../utils/logger';

export async function postbackHandler(client: Client, event: PostbackEvent): Promise<void> {
  const { replyToken, postback } = event;
  const userId = event.source.userId;
  
  if (!userId) {
    logger.warn('No userId in postback event');
    return;
  }
  
  logger.info('Processing postback:', { userId, data: postback.data });
  
  // Parse postback data
  const params = new URLSearchParams(postback.data);
  const action = params.get('action');
  
  let replyMessage: TextMessage;
  
  switch (action) {
    case 'warikan_detail':
      const warikanId = params.get('id');
      replyMessage = {
        type: 'text',
        text: `割り勘ID: ${warikanId}の詳細を表示します。`,
      };
      break;
      
    case 'schedule_confirm':
      const scheduleId = params.get('id');
      replyMessage = {
        type: 'text',
        text: `予定ID: ${scheduleId}を確認しました。`,
      };
      break;
      
    default:
      replyMessage = {
        type: 'text',
        text: 'アクションを処理できませんでした。',
      };
  }
  
  await client.replyMessage(replyToken, replyMessage);
}