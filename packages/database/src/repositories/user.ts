import { DocumentSnapshot } from '@google-cloud/firestore';
import { User, UserSchema } from '@line-secretary/shared';
import { FirestoreRepository } from '../firestore';

export class UserRepository extends FirestoreRepository<User> {
  constructor() {
    super('users');
  }
  
  protected fromFirestore(doc: DocumentSnapshot): User | null {
    if (!doc.exists) return null;
    
    const data = doc.data();
    if (!data) return null;
    
    try {
      return UserSchema.parse({
        ...data,
        userId: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    } catch (error) {
      console.error('Failed to parse user document:', error);
      return null;
    }
  }
  
  protected toFirestore(user: User): any {
    const { userId, ...data } = user;
    return this.addTimestamps(data);
  }
  
  async findByLineUserId(lineUserId: string): Promise<User | null> {
    const users = await this.findWhere('lineUserId', '==', lineUserId, 1);
    return users[0] || null;
  }
  
  async findByPlan(plan: User['plan'], limit = 100): Promise<User[]> {
    return this.findWhere('plan', '==', plan, limit);
  }
  
  async updateUsage(userId: string, apiCalls: number): Promise<void> {
    const now = new Date();
    await this.update(userId, {
      usage: {
        apiCalls,
        lastApiCall: now,
        monthlyApiCalls: apiCalls,
      },
    } as Partial<User>);
  }
  
  async incrementApiCalls(userId: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');
    
    const newApiCalls = user.usage.apiCalls + 1;
    await this.updateUsage(userId, newApiCalls);
  }
}