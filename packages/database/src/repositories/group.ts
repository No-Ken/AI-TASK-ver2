import { DocumentSnapshot } from '@google-cloud/firestore';
import { Group, GroupSchema, GroupMemberRole } from '@line-secretary/shared';
import { FirestoreRepository } from '../firestore';

export class GroupRepository extends FirestoreRepository<Group> {
  constructor() {
    super('groups');
  }
  
  protected fromFirestore(doc: DocumentSnapshot): Group | null {
    if (!doc.exists) return null;
    
    const data = doc.data();
    if (!data) return null;
    
    try {
      return GroupSchema.parse({
        ...data,
        groupId: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        members: data.members?.map((member: any) => ({
          ...member,
          joinedAt: member.joinedAt?.toDate() || new Date(),
        })) || [],
      });
    } catch (error) {
      console.error('Failed to parse group document:', error);
      return null;
    }
  }
  
  protected toFirestore(group: Group): any {
    const { groupId, ...data } = group;
    return this.addTimestamps({
      ...data,
      members: data.members.map(member => ({
        ...member,
        joinedAt: member.joinedAt,
      })),
    });
  }
  
  async findByLineGroupId(lineGroupId: string): Promise<Group | null> {
    const groups = await this.findWhere('lineGroupId', '==', lineGroupId, 1);
    return groups[0] || null;
  }
  
  async findByMember(userId: string, limit = 50): Promise<Group[]> {
    const query = this.collection
      .where('members', 'array-contains-any', [{ userId }])
      .orderBy('updatedAt', 'desc');
    
    const snapshot = await query.limit(limit).get();
    return this.mapSnapshot(snapshot);
  }
  
  async addMember(groupId: string, userId: string, role: GroupMemberRole = 'member'): Promise<void> {
    const group = await this.findById(groupId);
    if (!group) throw new Error('Group not found');
    
    const existingMember = group.members.find(m => m.userId === userId);
    if (existingMember) return;
    
    const newMember = {
      userId,
      role,
      joinedAt: new Date(),
    };
    
    const updatedMembers = [...group.members, newMember];
    await this.update(groupId, { members: updatedMembers } as Partial<Group>);
  }
  
  async removeMember(groupId: string, userId: string): Promise<void> {
    const group = await this.findById(groupId);
    if (!group) throw new Error('Group not found');
    
    const updatedMembers = group.members.filter(m => m.userId !== userId);
    await this.update(groupId, { members: updatedMembers } as Partial<Group>);
  }
  
  async updateMemberRole(groupId: string, userId: string, role: GroupMemberRole): Promise<void> {
    const group = await this.findById(groupId);
    if (!group) throw new Error('Group not found');
    
    const updatedMembers = group.members.map(m => 
      m.userId === userId ? { ...m, role } : m
    );
    
    await this.update(groupId, { members: updatedMembers } as Partial<Group>);
  }
  
  async isMember(groupId: string, userId: string): Promise<boolean> {
    const group = await this.findById(groupId);
    if (!group) return false;
    
    return group.members.some(m => m.userId === userId);
  }
  
  async getMemberRole(groupId: string, userId: string): Promise<GroupMemberRole | null> {
    const group = await this.findById(groupId);
    if (!group) return null;
    
    const member = group.members.find(m => m.userId === userId);
    return member?.role || null;
  }
}