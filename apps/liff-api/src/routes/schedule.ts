import { Router } from 'express';
import { z } from 'zod';
import { ScheduleRepository } from '@line-secretary/database';
import { ScheduleSchema } from '@line-secretary/shared';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const scheduleRepository = new ScheduleRepository();

// Get schedules for user
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.user!;
    const { type, days = '7' } = req.query;
    
    let schedules;
    if (type === 'today') {
      schedules = await scheduleRepository.findTodaySchedules(userId);
    } else if (type === 'upcoming') {
      const hours = parseInt(days as string) * 24;
      schedules = await scheduleRepository.findUpcomingSchedules(userId, hours);
    } else {
      schedules = await scheduleRepository.findByUser(userId);
    }
    
    res.json({ data: schedules });
  } catch (error) {
    logger.error('Get schedules error:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// Get schedule by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user!;
    
    const schedule = await scheduleRepository.findById(id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    if (schedule.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ data: schedule });
  } catch (error) {
    logger.error('Get schedule error:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// Create schedule
const createScheduleSchema = z.object({
  type: z.enum(['event', 'task', 'reminder']).default('event'),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  allDay: z.boolean().default(false),
  location: z.string().optional(),
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.user!;
    const data = createScheduleSchema.parse(req.body);
    
    const schedule = ScheduleSchema.parse({
      scheduleId: '', // Will be set by repository
      userId,
      type: data.type,
      title: data.title,
      description: data.description,
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      allDay: data.allDay,
      location: data.location,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    const scheduleId = await scheduleRepository.create(schedule);
    const createdSchedule = await scheduleRepository.findById(scheduleId);
    
    res.status(201).json({ data: createdSchedule });
  } catch (error) {
    logger.error('Create schedule error:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// Update schedule
const updateScheduleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  allDay: z.boolean().optional(),
  location: z.string().optional(),
});

router.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user!;
    const data = updateScheduleSchema.parse(req.body);
    
    const schedule = await scheduleRepository.findById(id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    if (schedule.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updates: any = {};
    if (data.title) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.startTime) updates.startTime = new Date(data.startTime);
    if (data.endTime !== undefined) updates.endTime = data.endTime ? new Date(data.endTime) : null;
    if (data.allDay !== undefined) updates.allDay = data.allDay;
    if (data.location !== undefined) updates.location = data.location;
    
    await scheduleRepository.update(id, updates);
    const updatedSchedule = await scheduleRepository.findById(id);
    
    res.json({ data: updatedSchedule });
  } catch (error) {
    logger.error('Update schedule error:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// Update schedule status
const updateStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
});

router.patch('/:id/status', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user!;
    const { status } = updateStatusSchema.parse(req.body);
    
    const schedule = await scheduleRepository.findById(id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    if (schedule.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await scheduleRepository.updateStatus(id, status);
    const updatedSchedule = await scheduleRepository.findById(id);
    
    res.json({ data: updatedSchedule });
  } catch (error) {
    logger.error('Update schedule status error:', error);
    res.status(500).json({ error: 'Failed to update schedule status' });
  }
});

// Delete schedule
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user!;
    
    const schedule = await scheduleRepository.findById(id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    if (schedule.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await scheduleRepository.delete(id);
    res.status(204).send();
  } catch (error) {
    logger.error('Delete schedule error:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

export { router as scheduleRoutes };