import { Router } from 'express';
import { z } from 'zod';
import { WarikanRepository } from '@line-secretary/database';
import { WarikanSchema } from '@line-secretary/shared';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const warikanRepository = new WarikanRepository();

// Get all warikans for user
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.user!;
    const warikans = await warikanRepository.findByCreator(userId);
    res.json({ data: warikans });
  } catch (error) {
    logger.error('Get warikans error:', error);
    res.status(500).json({ error: 'Failed to fetch warikans' });
  }
});

// Get warikan by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user!;
    
    const warikan = await warikanRepository.findById(id);
    if (!warikan) {
      return res.status(404).json({ error: 'Warikan not found' });
    }
    
    // Check if user has access
    const isMember = warikan.createdBy === userId || 
      warikan.members.some(m => m.userId === userId);
    
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ data: warikan });
  } catch (error) {
    logger.error('Get warikan error:', error);
    res.status(500).json({ error: 'Failed to fetch warikan' });
  }
});

// Create warikan
const createWarikanSchema = z.object({
  title: z.string().min(1).max(100),
  totalAmount: z.number().positive(),
  memberCount: z.number().min(1).max(20),
  description: z.string().optional(),
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.user!;
    const data = createWarikanSchema.parse(req.body);
    
    const amountPerPerson = Math.ceil(data.totalAmount / data.memberCount);
    
    const members = [{
      userId,
      displayName: 'あなた',
      amount: amountPerPerson,
      isPaid: false,
    }];
    
    // Add placeholder members
    for (let i = 1; i < data.memberCount; i++) {
      members.push({
        userId: `placeholder_${i}`,
        displayName: `メンバー${i + 1}`,
        amount: amountPerPerson,
        isPaid: false,
      });
    }
    
    const warikan = WarikanSchema.parse({
      warikanId: '', // Will be set by repository
      createdBy: userId,
      title: data.title,
      totalAmount: data.totalAmount,
      currency: 'JPY',
      members,
      status: 'active',
      description: data.description,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    const warikanId = await warikanRepository.create(warikan);
    const createdWarikan = await warikanRepository.findById(warikanId);
    
    res.status(201).json({ data: createdWarikan });
  } catch (error) {
    logger.error('Create warikan error:', error);
    res.status(500).json({ error: 'Failed to create warikan' });
  }
});

// Update warikan status
const updateStatusSchema = z.object({
  status: z.enum(['active', 'settled', 'cancelled']),
});

router.patch('/:id/status', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user!;
    const { status } = updateStatusSchema.parse(req.body);
    
    const warikan = await warikanRepository.findById(id);
    if (!warikan) {
      return res.status(404).json({ error: 'Warikan not found' });
    }
    
    if (warikan.createdBy !== userId) {
      return res.status(403).json({ error: 'Only creator can update status' });
    }
    
    await warikanRepository.updateStatus(id, status);
    const updatedWarikan = await warikanRepository.findById(id);
    
    res.json({ data: updatedWarikan });
  } catch (error) {
    logger.error('Update warikan status error:', error);
    res.status(500).json({ error: 'Failed to update warikan status' });
  }
});

// Mark member as paid
router.patch('/:id/pay', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user!;
    
    const warikan = await warikanRepository.findById(id);
    if (!warikan) {
      return res.status(404).json({ error: 'Warikan not found' });
    }
    
    const member = warikan.members.find(m => m.userId === userId);
    if (!member) {
      return res.status(403).json({ error: 'Not a member of this warikan' });
    }
    
    if (member.isPaid) {
      return res.status(400).json({ error: 'Already paid' });
    }
    
    await warikanRepository.markMemberPaid(id, userId);
    const updatedWarikan = await warikanRepository.findById(id);
    
    res.json({ data: updatedWarikan });
  } catch (error) {
    logger.error('Mark member paid error:', error);
    res.status(500).json({ error: 'Failed to mark as paid' });
  }
});

export { router as warikanRoutes };