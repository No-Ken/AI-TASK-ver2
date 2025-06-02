import { Client, FollowEvent, TextMessage } from '@line/bot-sdk';
import { userService } from '../services/user';
import { Database } from '@line-secretary/database';
import { logger } from '../utils/logger';

export async function followHandler(client: Client, event: FollowEvent): Promise<void> {
  const userId = event.source.userId;
  
  if (!userId) {
    logger.warn('No userId in follow event');
    return;
  }
  
  logger.info('New user followed:', { userId });
  
  try {
    // Create user profile
    await userService.createUser(userId);
    
    const welcomeMessage: TextMessage = {
      type: 'text',
      text: `はじめまして！LINE秘書TASKです👋

私はあなたの日常をサポートするAIアシスタントです。

【できること】
📝 タスク・スケジュール管理
💰 割り勘計算
📅 日程調整
📋 メモ・リマインダー

使い方は「@ヘルプ」とメッセージを送ってください。
よろしくお願いします！`,
    };
    
    await client.pushMessage(userId, welcomeMessage);
  } catch (error) {
    logger.error('Error handling follow event:', error);
  }
}