import { TextMessage } from '@line/bot-sdk';
import { Schedule, ScheduleSchema, dateUtils, formatUtils } from '@line-secretary/shared';
import { ScheduleRepository } from '@line-secretary/database';
import { Command } from './command-parser';
import { userService } from './user';
import { v4 as uuid } from 'uuid';
import { logger } from '../utils/logger';

export class ScheduleService {
  private scheduleRepository: ScheduleRepository;
  
  constructor() {
    this.scheduleRepository = new ScheduleRepository();
  }
  
  async handleCommand(userId: string, command: Command): Promise<TextMessage> {
    try {
      const user = await userService.getUser(userId);
      if (!user) {
        return {
          type: 'text',
          text: 'ユーザー情報が見つかりません。もう一度お試しください。',
        };
      }
      
      await userService.incrementApiUsage(user.userId);
      
      const [subCommand, ...args] = command.args;
      
      switch (subCommand) {
        case '追加':
        case '登録':
        case '新規':
          return this.createSchedule(user.userId, args);
          
        case '今日':
        case '今日の予定':
          return this.getTodaySchedules(user.userId);
          
        case '明日':
        case '明日の予定':
          return this.getTomorrowSchedules(user.userId);
          
        case '一覧':
        case 'リスト':
          return this.getUpcomingSchedules(user.userId);
          
        case '詳細':
          return this.getScheduleDetail(args[0]);
          
        case '完了':
        case '終了':
          return this.completeSchedule(args[0], user.userId);
          
        case '削除':
          return this.deleteSchedule(args[0], user.userId);
          
        default:
          // Default to create if date and title provided
          if (args.length >= 2) {
            return this.createSchedule(user.userId, command.args);
          }
          return this.getHelpMessage();
      }
    } catch (error) {
      logger.error('Schedule command error:', error);
      return {
        type: 'text',
        text: 'エラーが発生しました。しばらくしてからもう一度お試しください。',
      };
    }
  }
  
  private async createSchedule(userId: string, args: string[]): Promise<TextMessage> {
    if (args.length < 2) {
      return {
        type: 'text',
        text: '使い方: @予定 [日時] [タイトル] [説明（省略可）]\n例: @予定 明日 14:00 会議 資料準備',
      };
    }
    
    const dateTimeStr = args[0];
    const timeStr = args.length > 2 && args[1].includes(':') ? args[1] : null;
    const titleStart = timeStr ? 2 : 1;
    const title = args.slice(titleStart, titleStart + 1).join(' ');
    const description = args.slice(titleStart + 1).join(' ') || undefined;
    
    if (!title) {
      return {
        type: 'text',
        text: 'タイトルを入力してください。',
      };
    }
    
    const startTime = this.parseDateTime(dateTimeStr, timeStr);
    if (!startTime) {
      return {
        type: 'text',
        text: '日時の形式が正しくありません。\n例: 明日, 12/25, 2024/12/25 14:00',
      };
    }
    
    const scheduleId = uuid();
    const now = new Date();
    
    const schedule: Schedule = ScheduleSchema.parse({
      scheduleId,
      userId,
      type: 'event',
      title,
      description,
      startTime,
      allDay: !timeStr,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });
    
    await this.scheduleRepository.createWithId(scheduleId, schedule);
    
    const timeDisplay = timeStr 
      ? dateUtils.format(startTime, 'MM/DD(ddd) HH:mm')
      : dateUtils.format(startTime, 'MM/DD(ddd) 終日');
    
    return {
      type: 'text',
      text: `📅 予定を追加しました！

📝 ${title}
📅 ${timeDisplay}
${description ? `📋 ${description}` : ''}

ID: ${scheduleId}

詳細確認: @予定 詳細 ${scheduleId}
完了にする: @予定 完了 ${scheduleId}`,
    };
  }
  
  private async getTodaySchedules(userId: string): Promise<TextMessage> {
    const schedules = await this.scheduleRepository.findTodaySchedules(userId);
    
    if (schedules.length === 0) {
      return {
        type: 'text',
        text: '📅 今日の予定はありません。\n\n予定追加: @予定 [日時] [タイトル]',
      };
    }
    
    const scheduleList = schedules.map((s, index) => {
      const timeDisplay = s.allDay 
        ? '終日' 
        : dateUtils.format(s.startTime, 'HH:mm');
      const status = s.status === 'completed' ? '✅' : '⏳';
      
      return `${index + 1}. ${status} ${timeDisplay} ${s.title}`;
    }).join('\n');
    
    const today = dateUtils.format(new Date(), 'MM/DD(ddd)');
    
    return {
      type: 'text',
      text: `📅 ${today}の予定

${scheduleList}

詳細確認: @予定 詳細 [ID]
予定追加: @予定 [日時] [タイトル]`,
    };
  }
  
  private async getTomorrowSchedules(userId: string): Promise<TextMessage> {
    const tomorrow = dateUtils.addDays(new Date(), 1);
    const startOfDay = dateUtils.startOfDay(tomorrow);
    const endOfDay = dateUtils.endOfDay(tomorrow);
    
    const schedules = await this.scheduleRepository.findByDateRange(
      userId, 
      startOfDay.toDate(), 
      endOfDay.toDate()
    );
    
    if (schedules.length === 0) {
      return {
        type: 'text',
        text: '📅 明日の予定はありません。\n\n予定追加: @予定 明日 [時間] [タイトル]',
      };
    }
    
    const scheduleList = schedules.map((s, index) => {
      const timeDisplay = s.allDay 
        ? '終日' 
        : dateUtils.format(s.startTime, 'HH:mm');
      const status = s.status === 'completed' ? '✅' : '⏳';
      
      return `${index + 1}. ${status} ${timeDisplay} ${s.title}`;
    }).join('\n');
    
    const tomorrowStr = dateUtils.format(tomorrow, 'MM/DD(ddd)');
    
    return {
      type: 'text',
      text: `📅 ${tomorrowStr}の予定

${scheduleList}

詳細確認: @予定 詳細 [ID]
予定追加: @予定 明日 [時間] [タイトル]`,
    };
  }
  
  private async getUpcomingSchedules(userId: string): Promise<TextMessage> {
    const schedules = await this.scheduleRepository.findUpcomingSchedules(userId, 168); // 7 days
    
    if (schedules.length === 0) {
      return {
        type: 'text',
        text: '📅 今後の予定はありません。\n\n予定追加: @予定 [日時] [タイトル]',
      };
    }
    
    const scheduleList = schedules.slice(0, 10).map((s, index) => {
      const timeDisplay = s.allDay 
        ? dateUtils.format(s.startTime, 'MM/DD(ddd) 終日')
        : dateUtils.format(s.startTime, 'MM/DD(ddd) HH:mm');
      const status = s.status === 'completed' ? '✅' : '⏳';
      
      return `${index + 1}. ${status} ${timeDisplay} ${s.title}`;
    }).join('\n');
    
    return {
      type: 'text',
      text: `📅 今後の予定（7日間）

${scheduleList}

詳細確認: @予定 詳細 [ID]
予定追加: @予定 [日時] [タイトル]`,
    };
  }
  
  private async getScheduleDetail(scheduleId: string): Promise<TextMessage> {
    if (!scheduleId) {
      return {
        type: 'text',
        text: '予定IDを指定してください。\n例: @予定 詳細 abc123',
      };
    }
    
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      return {
        type: 'text',
        text: '指定された予定が見つかりません。',
      };
    }
    
    const timeDisplay = schedule.allDay 
      ? dateUtils.format(schedule.startTime, 'YYYY/MM/DD(ddd) 終日')
      : dateUtils.format(schedule.startTime, 'YYYY/MM/DD(ddd) HH:mm');
    
    const statusText = schedule.status === 'completed' ? '✅ 完了' : '⏳ 予定';
    
    return {
      type: 'text',
      text: `📅 予定詳細

📝 ${schedule.title}
📅 ${timeDisplay}
📊 ${statusText}
${schedule.description ? `📋 ${schedule.description}` : ''}

🆔 ID: ${schedule.scheduleId}
📅 作成日: ${dateUtils.format(schedule.createdAt, 'YYYY/MM/DD')}

完了にする: @予定 完了 ${schedule.scheduleId}
削除する: @予定 削除 ${schedule.scheduleId}`,
    };
  }
  
  private async completeSchedule(scheduleId: string, userId: string): Promise<TextMessage> {
    if (!scheduleId) {
      return {
        type: 'text',
        text: '予定IDを指定してください。\n例: @予定 完了 abc123',
      };
    }
    
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      return {
        type: 'text',
        text: '指定された予定が見つかりません。',
      };
    }
    
    if (schedule.userId !== userId) {
      return {
        type: 'text',
        text: '自分の予定のみ完了にできます。',
      };
    }
    
    if (schedule.status === 'completed') {
      return {
        type: 'text',
        text: 'この予定はすでに完了しています。',
      };
    }
    
    await this.scheduleRepository.updateStatus(scheduleId, 'completed');
    
    return {
      type: 'text',
      text: `✅ 予定を完了にしました！

📝 ${schedule.title}
📅 ${dateUtils.format(schedule.startTime, 'MM/DD(ddd)')}

お疲れさまでした！`,
    };
  }
  
  private async deleteSchedule(scheduleId: string, userId: string): Promise<TextMessage> {
    if (!scheduleId) {
      return {
        type: 'text',
        text: '予定IDを指定してください。\n例: @予定 削除 abc123',
      };
    }
    
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      return {
        type: 'text',
        text: '指定された予定が見つかりません。',
      };
    }
    
    if (schedule.userId !== userId) {
      return {
        type: 'text',
        text: '自分の予定のみ削除できます。',
      };
    }
    
    await this.scheduleRepository.delete(scheduleId);
    
    return {
      type: 'text',
      text: `🗑️ 予定を削除しました

📝 ${schedule.title}
📅 ${dateUtils.format(schedule.startTime, 'MM/DD(ddd)')}`,
    };
  }
  
  private parseDateTime(dateStr: string, timeStr?: string | null): Date | null {
    try {
      const now = dateUtils.now();
      let targetDate = now;
      
      // Parse date part
      if (dateStr === '今日') {
        targetDate = now;
      } else if (dateStr === '明日') {
        targetDate = dateUtils.addDays(now, 1);
      } else if (dateStr === '明後日') {
        targetDate = dateUtils.addDays(now, 2);
      } else if (dateStr.match(/^\d{1,2}\/\d{1,2}$/)) {
        // MM/DD format
        const [month, day] = dateStr.split('/').map(Number);
        targetDate = now.month(month - 1).date(day);
        if (targetDate.isBefore(now, 'day')) {
          targetDate = targetDate.add(1, 'year');
        }
      } else if (dateStr.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
        // YYYY/MM/DD format
        const [year, month, day] = dateStr.split('/').map(Number);
        targetDate = dateUtils.parse(`${year}/${month}/${day}`);
      } else {
        return null;
      }
      
      // Parse time part
      if (timeStr && timeStr.match(/^\d{1,2}:\d{2}$/)) {
        const [hour, minute] = timeStr.split(':').map(Number);
        targetDate = targetDate.hour(hour).minute(minute).second(0).millisecond(0);
      } else {
        targetDate = targetDate.hour(0).minute(0).second(0).millisecond(0);
      }
      
      return targetDate.toDate();
    } catch (error) {
      logger.error('Failed to parse datetime:', { dateStr, timeStr, error });
      return null;
    }
  }
  
  private getHelpMessage(): TextMessage {
    return {
      type: 'text',
      text: `📅 予定機能の使い方

【予定追加】
@予定 [日時] [タイトル] [説明]
例: @予定 明日 14:00 会議 資料準備
例: @予定 12/25 クリスマス

【今日の予定】
@予定 今日

【明日の予定】
@予定 明日

【予定一覧】
@予定 一覧

【詳細確認】
@予定 詳細 [ID]

【完了にする】
@予定 完了 [ID]

【削除】
@予定 削除 [ID]`,
    };
  }
}

export const scheduleService = new ScheduleService();