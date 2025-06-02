import { Client, MessageEvent, TextMessage } from '@line/bot-sdk';
import { commandParser } from '../services/command-parser';
import { warikanService } from '../services/warikan';
import { scheduleService } from '../services/schedule';
import { memoService } from '../services/memo.service';
import { logger } from '../utils/logger';

export async function messageHandler(client: Client, event: MessageEvent): Promise<void> {
  if (event.message.type !== 'text') {
    return;
  }
  
  const { replyToken } = event;
  const userId = event.source.userId;
  const groupId = event.source.type === 'group' ? event.source.groupId : undefined;
  const text = event.message.text;
  
  if (!userId) {
    logger.warn('No userId in message event');
    return;
  }
  
  logger.info('Processing message:', { userId, text });
  
  const command = commandParser.parse(text);
  
  let replyMessage: TextMessage;
  
  switch (command.type) {
    case 'warikan':
      replyMessage = await warikanService.handleCommand(userId, command);
      break;
      
    case 'schedule':
      replyMessage = await scheduleService.handleCommand(userId, command);
      break;
      
    case 'memo':
      const memoResult = await memoService.processMessage({
        userId,
        groupId,
        messageText: text
      });
      replyMessage = {
        type: 'text',
        text: memoResult
      };
      break;
      
    case 'help':
      replyMessage = {
        type: 'text',
        text: `LINE秘書TASKの使い方

【割り勘機能】
• 割り勘作成: @割り勘 [金額] [人数]
• 割り勘一覧: @割り勘リスト

【スケジュール機能】
• 予定追加: @予定 [日時] [内容]
• 予定確認: @今日の予定

【メモ機能】
• メモ作成: @メモ 作成
• メモ一覧: @メモ 一覧
• メモ検索: @メモ 検索 [キーワード]

その他のコマンドは「@ヘルプ」でご確認ください。`,
      };
      break;
      
    default:
      replyMessage = {
        type: 'text',
        text: 'コマンドが認識できませんでした。「@ヘルプ」で使い方をご確認ください。',
      };
  }
  
  await client.replyMessage(replyToken, replyMessage);
}