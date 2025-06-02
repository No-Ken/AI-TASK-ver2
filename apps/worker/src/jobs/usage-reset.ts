import { UserRepository } from '@line-secretary/database';
import { logger } from '../utils/logger';

export class UsageResetJob {
  private userRepository: UserRepository;
  
  constructor() {
    this.userRepository = new UserRepository();
  }
  
  async execute(): Promise<void> {
    logger.info('Starting monthly usage reset job');
    
    try {
      // Get all users
      const users = await this.userRepository.findAll(10000); // Large limit for batch processing
      
      logger.info(`Found ${users.length} users for usage reset`);
      
      let resetCount = 0;
      
      for (const user of users) {
        try {
          await this.userRepository.resetMonthlyUsage(user.userId);
          resetCount++;
          
          // Add small delay for database performance
          if (resetCount % 100 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
            logger.info(`Reset usage for ${resetCount} users`);
          }
          
        } catch (error) {
          logger.error(`Failed to reset usage for user: ${user.userId}`, error);
        }
      }
      
      logger.info(`Monthly usage reset completed for ${resetCount} users`);
    } catch (error) {
      logger.error('Usage reset job failed:', error);
      throw error;
    }
  }
}

export const usageResetJob = new UsageResetJob();