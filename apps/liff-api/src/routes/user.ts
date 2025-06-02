import { Router } from 'express';
import { z } from 'zod';
import { UserRepository } from '@line-secretary/database';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const userRepository = new UserRepository();

// Get current user profile
router.get('/profile', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.user!;
    const user = await userRepository.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Remove sensitive information
    const { ...publicProfile } = user;
    
    res.json({ data: publicProfile });
  } catch (error) {
    logger.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user settings
const updateSettingsSchema = z.object({
  language: z.enum(['ja', 'en']).optional(),
  timezone: z.string().optional(),
  notifications: z.object({
    reminder: z.boolean().optional(),
    daily: z.boolean().optional(),
    weekly: z.boolean().optional(),
  }).optional(),
});

router.patch('/settings', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.user!;
    const settings = updateSettingsSchema.parse(req.body);
    
    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const updatedSettings = {
      ...user.settings,
      ...settings,
      notifications: {
        ...user.settings.notifications,
        ...settings.notifications,
      },
    };
    
    await userRepository.update(userId, { settings: updatedSettings } as any);
    const updatedUser = await userRepository.findById(userId);
    
    res.json({ data: updatedUser?.settings });
  } catch (error) {
    logger.error('Update user settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get user usage statistics
router.get('/usage', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.user!;
    const user = await userRepository.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      data: {
        usage: user.usage,
        plan: user.plan,
        planExpiresAt: user.planExpiresAt,
      }
    });
  } catch (error) {
    logger.error('Get user usage error:', error);
    res.status(500).json({ error: 'Failed to fetch usage statistics' });
  }
});

export { router as userRoutes };