import { Client } from '@line/bot-sdk';
import { ScheduleRepository, UserRepository } from '@line-secretary/database';
import { dateUtils } from '@line-secretary/shared';
import { config } from '../config';
import { logger } from '../utils/logger';

export class DailyNotificationJob {
  private client: Client;
  private scheduleRepository: ScheduleRepository;
  private userRepository: UserRepository;
  
  constructor() {
    this.client = new Client({
      channelAccessToken: config.line.channelAccessToken,
    });
    this.scheduleRepository = new ScheduleRepository();
    this.userRepository = new UserRepository();
  }
  
  async execute(): Promise<void> {
    logger.info('Starting daily notification job');
    
    try {
      // Get all users with daily notifications enabled
      const users = await this.userRepository.findAll(1000); // Limit for safety
      const enabledUsers = users.filter(user => user.settings.notifications.daily);
      
      logger.info(`Found ${enabledUsers.length} users with daily notifications enabled`);
      
      for (const user of enabledUsers) {
        try {
          const todaySchedules = await this.scheduleRepository.findTodaySchedules(user.userId);
          
          if (todaySchedules.length === 0) {
            continue; // Skip users with no schedules today
          }
          
          const today = dateUtils.format(new Date(), 'MM/DD(ddd)');
          
          const scheduleList = todaySchedules.slice(0, 5).map((schedule, index) => {
            const timeDisplay = schedule.allDay 
              ? '終日' 
              : dateUtils.format(schedule.startTime, 'HH:mm');
            return `${index + 1}. ${timeDisplay} ${schedule.title}`;
          }).join('\n');
          
          const moreText = todaySchedules.length > 5 
            ? `\n他${todaySchedules.length - 5}件の予定があります`
            : '';
          
          const message = {
            type: 'text' as const,
            text: `🌅 おはようございます！

📅 ${today}の予定

${scheduleList}${moreText}

今日も一日頑張りましょう！
詳細確認: @予定 今日`,
          };
          
          await this.client.pushMessage(user.lineUserId, message);
          logger.info(`Daily notification sent to user: ${user.userId}`);
          
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          logger.error(`Failed to send daily notification to user: ${user.userId}`, error);
        }
      }
      
      logger.info('Daily notification job completed');
    } catch (error) {
      logger.error('Daily notification job failed:', error);
      throw error;
    }
  }
}

export const dailyNotificationJob = new DailyNotificationJob();