import { DocumentSnapshot } from '@google-cloud/firestore';
import { Schedule, ScheduleSchema, ScheduleStatus, ScheduleType } from '@line-secretary/shared';
import { FirestoreRepository } from '../firestore';

export class ScheduleRepository extends FirestoreRepository<Schedule> {
  constructor() {
    super('schedules');
  }
  
  protected fromFirestore(doc: DocumentSnapshot): Schedule | null {
    if (!doc.exists) return null;
    
    const data = doc.data();
    if (!data) return null;
    
    try {
      return ScheduleSchema.parse({
        ...data,
        scheduleId: doc.id,
        startTime: data.startTime?.toDate() || new Date(),
        endTime: data.endTime?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        recurrence: data.recurrence ? {
          ...data.recurrence,
          endDate: data.recurrence.endDate?.toDate(),
        } : undefined,
      });
    } catch (error) {
      console.error('Failed to parse schedule document:', error);
      return null;
    }
  }
  
  protected toFirestore(schedule: Schedule): any {
    const { scheduleId, ...data } = schedule;
    return this.addTimestamps({
      ...data,
      endTime: data.endTime || null,
      recurrence: data.recurrence ? {
        ...data.recurrence,
        endDate: data.recurrence.endDate || null,
      } : null,
    });
  }
  
  async findByUser(userId: string, type?: ScheduleType, limit = 100): Promise<Schedule[]> {
    let query = this.collection.where('userId', '==', userId);
    
    if (type) {
      query = query.where('type', '==', type);
    }
    
    query = query.orderBy('startTime', 'asc');
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const snapshot = await query.get();
    return this.mapSnapshot(snapshot);
  }
  
  async findByGroup(groupId: string, type?: ScheduleType, limit = 100): Promise<Schedule[]> {
    let query = this.collection.where('groupId', '==', groupId);
    
    if (type) {
      query = query.where('type', '==', type);
    }
    
    query = query.orderBy('startTime', 'asc');
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const snapshot = await query.get();
    return this.mapSnapshot(snapshot);
  }
  
  async findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Schedule[]> {
    const query = this.collection
      .where('userId', '==', userId)
      .where('startTime', '>=', startDate)
      .where('startTime', '<=', endDate)
      .orderBy('startTime', 'asc');
    
    const snapshot = await query.get();
    return this.mapSnapshot(snapshot);
  }
  
  async findTodaySchedules(userId: string): Promise<Schedule[]> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    return this.findByDateRange(userId, startOfDay, endOfDay);
  }
  
  async findUpcomingSchedules(userId: string, hours = 24): Promise<Schedule[]> {
    const now = new Date();
    const future = new Date(now.getTime() + hours * 60 * 60 * 1000);
    
    return this.findByDateRange(userId, now, future);
  }
  
  async updateStatus(scheduleId: string, status: ScheduleStatus): Promise<void> {
    await this.update(scheduleId, { status } as Partial<Schedule>);
  }
  
  async addParticipant(scheduleId: string, userId: string): Promise<void> {
    const schedule = await this.findById(scheduleId);
    if (!schedule) throw new Error('Schedule not found');
    
    const participants = schedule.participants || [];
    const existingParticipant = participants.find(p => p.userId === userId);
    
    if (!existingParticipant) {
      participants.push({
        userId,
        status: 'pending',
      });
      
      await this.update(scheduleId, { participants } as Partial<Schedule>);
    }
  }
  
  async updateParticipantStatus(scheduleId: string, userId: string, status: 'accepted' | 'declined'): Promise<void> {
    const schedule = await this.findById(scheduleId);
    if (!schedule) throw new Error('Schedule not found');
    
    const participants = (schedule.participants || []).map(p => 
      p.userId === userId ? { ...p, status } : p
    );
    
    await this.update(scheduleId, { participants } as Partial<Schedule>);
  }
}