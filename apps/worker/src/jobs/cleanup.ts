import { WarikanRepository, ScheduleRepository } from '@line-secretary/database';
import { dateUtils } from '@line-secretary/shared';
import { logger } from '../utils/logger';

export class CleanupJob {
  private warikanRepository: WarikanRepository;
  private scheduleRepository: ScheduleRepository;
  
  constructor() {
    this.warikanRepository = new WarikanRepository();
    this.scheduleRepository = new ScheduleRepository();
  }
  
  async execute(): Promise<void> {
    logger.info('Starting cleanup job');
    
    try {
      await this.cleanupOldWarikans();
      await this.cleanupOldSchedules();
      
      logger.info('Cleanup job completed');
    } catch (error) {
      logger.error('Cleanup job failed:', error);
      throw error;
    }
  }
  
  private async cleanupOldWarikans(): Promise<void> {
    try {
      // Clean up settled warikans older than 6 months
      const sixMonthsAgo = dateUtils.now().subtract(6, 'month').toDate();
      
      // This would require a custom query in the repository
      // For now, we'll skip the actual deletion and just log
      logger.info('Warikan cleanup: Would clean up settled warikans older than 6 months');
      
      // TODO: Implement actual cleanup logic
      // const oldWarikans = await this.warikanRepository.findOldSettled(sixMonthsAgo);
      // for (const warikan of oldWarikans) {
      //   await this.warikanRepository.delete(warikan.warikanId);
      // }
      
    } catch (error) {
      logger.error('Failed to cleanup old warikans:', error);
    }
  }
  
  private async cleanupOldSchedules(): Promise<void> {
    try {
      // Clean up completed schedules older than 1 year
      const oneYearAgo = dateUtils.now().subtract(1, 'year').toDate();
      
      // This would require a custom query in the repository
      // For now, we'll skip the actual deletion and just log
      logger.info('Schedule cleanup: Would clean up completed schedules older than 1 year');
      
      // TODO: Implement actual cleanup logic
      // const oldSchedules = await this.scheduleRepository.findOldCompleted(oneYearAgo);
      // for (const schedule of oldSchedules) {
      //   await this.scheduleRepository.delete(schedule.scheduleId);
      // }
      
    } catch (error) {
      logger.error('Failed to cleanup old schedules:', error);
    }
  }
}

export const cleanupJob = new CleanupJob();