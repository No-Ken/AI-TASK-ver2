import { Client, Profile } from '@line/bot-sdk';
import { User, UserSchema, PLAN_LIMITS } from '@line-secretary/shared';
import { UserRepository, Database } from '@line-secretary/database';
import { v4 as uuid } from 'uuid';
import { logger } from '../utils/logger';

export class UserService {
  private userRepository: UserRepository;
  
  constructor() {
    this.userRepository = new UserRepository();
  }
  
  async createUser(lineUserId: string, profile?: Profile): Promise<User> {
    try {
      const existingUser = await this.userRepository.findByLineUserId(lineUserId);
      if (existingUser) {
        return existingUser;
      }
      
      const userId = uuid();
      const now = new Date();
      
      const userData: User = UserSchema.parse({
        userId,
        lineUserId,
        displayName: profile?.displayName,
        pictureUrl: profile?.pictureUrl,
        plan: 'free',
        settings: {
          language: 'ja',
          timezone: 'Asia/Tokyo',
          notifications: {
            reminder: true,
            daily: true,
            weekly: false,
          },
        },
        usage: {
          apiCalls: 0,
          monthlyApiCalls: 0,
        },
        createdAt: now,
        updatedAt: now,
      });
      
      await this.userRepository.createWithId(userId, userData);
      logger.info('User created:', { userId, lineUserId });
      
      return userData;
    } catch (error) {
      logger.error('Failed to create user:', error);
      throw error;
    }
  }
  
  async getUser(lineUserId: string): Promise<User | null> {
    return this.userRepository.findByLineUserId(lineUserId);
  }
  
  async getUserById(userId: string): Promise<User | null> {
    return this.userRepository.findById(userId);
  }
  
  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    await this.userRepository.update(userId, updates);
    logger.info('User updated:', { userId });
  }
  
  async checkRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const limits = PLAN_LIMITS[user.plan];
    const remaining = limits.apiCallsPerDay - user.usage.apiCalls;
    const allowed = remaining > 0;
    
    return { allowed, remaining };
  }
  
  async incrementApiUsage(userId: string): Promise<void> {
    const rateLimit = await this.checkRateLimit(userId);
    if (!rateLimit.allowed) {
      throw new Error('Rate limit exceeded');
    }
    
    await this.userRepository.incrementApiCalls(userId);
  }
  
  async upgradePlan(userId: string, plan: User['plan'], expiresAt?: Date): Promise<void> {
    const updates: Partial<User> = {
      plan,
      planExpiresAt: expiresAt,
    };
    
    await this.updateUser(userId, updates);
    logger.info('User plan upgraded:', { userId, plan });
  }
  
  async updateProfile(lineUserId: string, profile: Profile): Promise<void> {
    const user = await this.getUser(lineUserId);
    if (!user) return;
    
    const updates: Partial<User> = {
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
    };
    
    await this.updateUser(user.userId, updates);
  }
  
  async updateSettings(userId: string, settings: Partial<User['settings']>): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const updates: Partial<User> = {
      settings: {
        ...user.settings,
        ...settings,
      },
    };
    
    await this.updateUser(userId, updates);
  }
  
  async resetMonthlyUsage(userId: string): Promise<void> {
    const updates: Partial<User> = {
      usage: {
        apiCalls: 0,
        monthlyApiCalls: 0,
        lastApiCall: undefined,
      },
    };
    
    await this.updateUser(userId, updates);
  }
  
  async deleteUser(userId: string): Promise<void> {
    await this.userRepository.delete(userId);
    logger.info('User deleted:', { userId });
  }
}

export const userService = new UserService();