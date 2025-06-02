import { DocumentSnapshot } from '@google-cloud/firestore';
import { PersonalMemo, PersonalMemoSchema, SharedMemo, SharedMemoSchema, MemoPage, MemoPageSchema } from '@line-secretary/shared';
import { FirestoreRepository } from '../firestore';

export class PersonalMemoRepository extends FirestoreRepository<PersonalMemo> {
  constructor() {
    super('personalMemos');
  }
  
  protected fromFirestore(doc: DocumentSnapshot): PersonalMemo | null {
    if (!doc.exists) return null;
    
    const data = doc.data();
    if (!data) return null;
    
    try {
      return PersonalMemoSchema.parse({
        ...data,
        memoId: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    } catch (error) {
      console.error('Failed to parse personal memo document:', error);
      return null;
    }
  }
  
  protected toFirestore(memo: PersonalMemo): any {
    const { memoId, ...data } = memo;
    return this.addTimestamps(data);
  }
  
  async findByUser(userId: string, includeArchived = false): Promise<PersonalMemo[]> {
    let query = this.collection.where('userId', '==', userId);
    
    if (!includeArchived) {
      query = query.where('isArchived', '==', false);
    }
    
    query = query.orderBy('createdAt', 'desc');
    
    const snapshot = await query.get();
    return this.mapSnapshot(snapshot);
  }
  
  async findByTags(userId: string, tags: string[]): Promise<PersonalMemo[]> {
    const query = this.collection
      .where('userId', '==', userId)
      .where('tags', 'array-contains-any', tags)
      .where('isArchived', '==', false)
      .orderBy('createdAt', 'desc');
    
    const snapshot = await query.get();
    return this.mapSnapshot(snapshot);
  }
  
  async searchByContent(userId: string, searchText: string): Promise<PersonalMemo[]> {
    // Note: Full-text search would require additional setup (e.g., Algolia, Elasticsearch)
    // For now, we'll return all memos and filter in memory
    const memos = await this.findByUser(userId);
    const searchLower = searchText.toLowerCase();
    
    return memos.filter(memo => 
      memo.title.toLowerCase().includes(searchLower) ||
      memo.content.toLowerCase().includes(searchLower) ||
      memo.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }
  
  async archive(memoId: string): Promise<void> {
    await this.update(memoId, { isArchived: true } as Partial<PersonalMemo>);
  }
  
  async unarchive(memoId: string): Promise<void> {
    await this.update(memoId, { isArchived: false } as Partial<PersonalMemo>);
  }
}

export class MemoPageRepository extends FirestoreRepository<MemoPage> {
  constructor() {
    super('memoPages');
  }
  
  protected fromFirestore(doc: DocumentSnapshot): MemoPage | null {
    if (!doc.exists) return null;
    
    const data = doc.data();
    if (!data) return null;
    
    try {
      return MemoPageSchema.parse({
        ...data,
        pageId: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    } catch (error) {
      console.error('Failed to parse memo page document:', error);
      return null;
    }
  }
  
  protected toFirestore(page: MemoPage): any {
    const { pageId, ...data } = page;
    return this.addTimestamps(data);
  }
  
  async findByUser(userId: string): Promise<MemoPage[]> {
    const query = this.collection
      .where('userId', '==', userId)
      .orderBy('order', 'asc');
    
    const snapshot = await query.get();
    return this.mapSnapshot(snapshot);
  }
  
  async findChildren(parentPageId: string): Promise<MemoPage[]> {
    const query = this.collection
      .where('parentPageId', '==', parentPageId)
      .orderBy('order', 'asc');
    
    const snapshot = await query.get();
    return this.mapSnapshot(snapshot);
  }
}

export class SharedMemoRepository extends FirestoreRepository<SharedMemo> {
  constructor() {
    super('sharedMemos');
  }
  
  protected fromFirestore(doc: DocumentSnapshot): SharedMemo | null {
    if (!doc.exists) return null;
    
    const data = doc.data();
    if (!data) return null;
    
    try {
      return SharedMemoSchema.parse({
        ...data,
        memoId: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        editors: data.editors?.map((editor: any) => ({
          ...editor,
          addedAt: editor.addedAt?.toDate() || new Date(),
          lastEditedAt: editor.lastEditedAt?.toDate(),
        })) || [],
      });
    } catch (error) {
      console.error('Failed to parse shared memo document:', error);
      return null;
    }
  }
  
  protected toFirestore(memo: SharedMemo): any {
    const { memoId, ...data } = memo;
    return this.addTimestamps({
      ...data,
      editors: data.editors.map(editor => ({
        ...editor,
        addedAt: editor.addedAt,
        lastEditedAt: editor.lastEditedAt || null,
      })),
    });
  }
  
  async findByGroup(groupId: string, includeArchived = false): Promise<SharedMemo[]> {
    let query = this.collection.where('groupId', '==', groupId);
    
    if (!includeArchived) {
      query = query.where('status', '==', 'active');
    }
    
    query = query.orderBy('updatedAt', 'desc');
    
    const snapshot = await query.get();
    return this.mapSnapshot(snapshot);
  }
  
  async findByUser(userId: string): Promise<SharedMemo[]> {
    const query = this.collection
      .where('readableUserIds', 'array-contains', userId)
      .where('status', '==', 'active')
      .orderBy('updatedAt', 'desc');
    
    const snapshot = await query.get();
    return this.mapSnapshot(snapshot);
  }
  
  async addEditor(memoId: string, editor: SharedMemo['editors'][0]): Promise<void> {
    const memo = await this.findById(memoId);
    if (!memo) throw new Error('Shared memo not found');
    
    const existingEditor = memo.editors.find(e => e.userId === editor.userId);
    if (existingEditor) return;
    
    const updatedEditors = [...memo.editors, editor];
    const updatedReadableUserIds = [...new Set([...memo.readableUserIds, editor.userId])];
    
    await this.update(memoId, { 
      editors: updatedEditors,
      readableUserIds: updatedReadableUserIds,
    } as Partial<SharedMemo>);
  }
  
  async removeEditor(memoId: string, userId: string): Promise<void> {
    const memo = await this.findById(memoId);
    if (!memo) throw new Error('Shared memo not found');
    
    const updatedEditors = memo.editors.filter(e => e.userId !== userId);
    const updatedReadableUserIds = memo.readableUserIds.filter(id => id !== userId);
    
    await this.update(memoId, { 
      editors: updatedEditors,
      readableUserIds: updatedReadableUserIds,
    } as Partial<SharedMemo>);
  }
  
  async updateContent(memoId: string, content: string, editorId: string): Promise<void> {
    const memo = await this.findById(memoId);
    if (!memo) throw new Error('Shared memo not found');
    
    const editorIndex = memo.editors.findIndex(e => e.userId === editorId);
    if (editorIndex === -1) throw new Error('User is not an editor');
    
    const updatedEditors = [...memo.editors];
    updatedEditors[editorIndex].lastEditedAt = new Date();
    
    await this.update(memoId, { 
      content,
      editors: updatedEditors,
      lastEditedBy: editorId,
    } as Partial<SharedMemo>);
  }
  
  async archive(memoId: string): Promise<void> {
    await this.update(memoId, { status: 'archived' } as Partial<SharedMemo>);
  }
}