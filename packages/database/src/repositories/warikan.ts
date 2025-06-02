import { DocumentSnapshot } from '@google-cloud/firestore';
import { Warikan, WarikanSchema, WarikanStatus } from '@line-secretary/shared';
import { FirestoreRepository } from '../firestore';

export class WarikanRepository extends FirestoreRepository<Warikan> {
  constructor() {
    super('warikan');
  }
  
  protected fromFirestore(doc: DocumentSnapshot): Warikan | null {
    if (!doc.exists) return null;
    
    const data = doc.data();
    if (!data) return null;
    
    try {
      return WarikanSchema.parse({
        ...data,
        warikanId: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        settledAt: data.settledAt?.toDate(),
      });
    } catch (error) {
      console.error('Failed to parse warikan document:', error);
      return null;
    }
  }
  
  protected toFirestore(warikan: Warikan): any {
    const { warikanId, ...data } = warikan;
    return this.addTimestamps({
      ...data,
      settledAt: data.settledAt || null,
    });
  }
  
  async findByCreator(createdBy: string, status?: WarikanStatus, limit = 50): Promise<Warikan[]> {
    let query = this.collection.where('createdBy', '==', createdBy);
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    query = query.orderBy('createdAt', 'desc');
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const snapshot = await query.get();
    return this.mapSnapshot(snapshot);
  }
  
  async findByGroup(groupId: string, status?: WarikanStatus, limit = 50): Promise<Warikan[]> {
    let query = this.collection.where('groupId', '==', groupId);
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    query = query.orderBy('createdAt', 'desc');
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const snapshot = await query.get();
    return this.mapSnapshot(snapshot);
  }
  
  async findByMember(userId: string, status?: WarikanStatus, limit = 50): Promise<Warikan[]> {
    let query = this.collection.where('members', 'array-contains-any', [{ userId }]);
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    query = query.orderBy('createdAt', 'desc');
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const snapshot = await query.get();
    return this.mapSnapshot(snapshot);
  }
  
  async updateStatus(warikanId: string, status: WarikanStatus): Promise<void> {
    const updateData: Partial<Warikan> = { status } as Partial<Warikan>;
    
    if (status === 'settled') {
      (updateData as any).settledAt = new Date();
    }
    
    await this.update(warikanId, updateData);
  }
  
  async markMemberPaid(warikanId: string, memberId: string): Promise<void> {
    const warikan = await this.findById(warikanId);
    if (!warikan) throw new Error('Warikan not found');
    
    const updatedMembers = warikan.members.map(member => 
      member.userId === memberId 
        ? { ...member, isPaid: true, paidAt: new Date() }
        : member
    );
    
    await this.update(warikanId, { members: updatedMembers } as Partial<Warikan>);
  }
}