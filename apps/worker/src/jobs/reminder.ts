import { Client } from '@line/bot-sdk';
import { ScheduleRepository, UserRepository } from '@line-secretary/database';
import { dateUtils } from '@line-secretary/shared';
import { config } from '../config';
import { logger } from '../utils/logger';

export class ReminderJob {
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
    logger.info('Starting reminder job');
    
    try {
      const now = dateUtils.now();
      const in30Minutes = now.add(30, 'minute');
      
      // Find schedules that need reminders (30 minutes before)
      const schedules = await this.scheduleRepository.findByDateRange(
        '', // We'll filter by all users
        in30Minutes.subtract(1, 'minute').toDate(),
        in30Minutes.add(1, 'minute').toDate()
      );
      
      logger.info(`Found ${schedules.length} schedules for reminder`);
      
      for (const schedule of schedules) {
        try {
          const user = await this.userRepository.findById(schedule.userId);
          if (!user) {
            logger.warn(`User not found for schedule: ${schedule.scheduleId}`);
            continue;
          }
          
          if (!user.settings.notifications.reminder) {
            logger.debug(`Reminders disabled for user: ${user.userId}`);
            continue;
          }
          
          // Check if reminder was already sent (you might want to add a field to track this)
          // For now, we'll just send the reminder
          
          const timeDisplay = schedule.allDay 
            ? dateUtils.format(schedule.startTime, 'MM/DD(ddd) 終日')
            : dateUtils.format(schedule.startTime, 'MM/DD(ddd) HH:mm');
          
          const message = {
            type: 'text' as const,
            text: `🔔 予定のリマインダー

📝 ${schedule.title}
📅 ${timeDisplay}
⏰ 30分後に開始予定です

詳細確認: @予定 詳細 ${schedule.scheduleId}`,
          };
          
          await this.client.pushMessage(user.lineUserId, message);
          logger.info(`Reminder sent for schedule: ${schedule.scheduleId}`);
          
        } catch (error) {
          logger.error(`Failed to send reminder for schedule: ${schedule.scheduleId}`, error);
        }
      }
      
      logger.info('Reminder job completed');
    } catch (error) {
      logger.error('Reminder job failed:', error);
      throw error;
    }
  }
}

export const reminderJob = new ReminderJob();