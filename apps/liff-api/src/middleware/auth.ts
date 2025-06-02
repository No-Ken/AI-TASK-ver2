import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRepository } from '@line-secretary/database';
import { logger } from '../utils/logger';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    lineUserId: string;
  };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    // For development, we'll use a simple validation
    // In production, you should validate the LINE ID Token properly
    if (token === 'DUMMY_TOKEN') {
      req.user = {
        userId: 'dummy-user-id',
        lineUserId: 'DUMMY_LINE_USER_ID',
      };
      return next();
    }

    try {
      // In production, validate LINE ID Token here
      // const payload = jwt.verify(token, LINE_CHANNEL_SECRET);
      
      // For now, we'll decode without verification for development
      const decoded = jwt.decode(token) as any;
      if (!decoded?.sub) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const userRepository = new UserRepository();
      const user = await userRepository.findByLineUserId(decoded.sub);
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      req.user = {
        userId: user.userId,
        lineUserId: user.lineUserId,
      };

      next();
    } catch (error) {
      logger.error('Token validation failed:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

export type { AuthRequest };