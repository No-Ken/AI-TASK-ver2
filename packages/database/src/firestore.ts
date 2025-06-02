import { Firestore, DocumentSnapshot, QuerySnapshot, Transaction } from '@google-cloud/firestore';
import { Database } from './config';

export abstract class FirestoreRepository<T> {
  protected db: Firestore;
  
  constructor(protected collectionName: string) {
    this.db = Database.getInstance();
  }
  
  protected get collection() {
    return this.db.collection(this.collectionName);
  }
  
  protected abstract fromFirestore(doc: DocumentSnapshot): T | null;
  protected abstract toFirestore(data: T): any;
  
  async create(data: T): Promise<string> {
    const docRef = this.collection.doc();
    await docRef.set(this.toFirestore(data));
    return docRef.id;
  }
  
  async createWithId(id: string, data: T): Promise<void> {
    const docRef = this.collection.doc(id);
    await docRef.set(this.toFirestore(data));
  }
  
  async findById(id: string): Promise<T | null> {
    const doc = await this.collection.doc(id).get();
    return this.fromFirestore(doc);
  }
  
  async update(id: string, data: Partial<T>): Promise<void> {
    const docRef = this.collection.doc(id);
    await docRef.update({
      ...data,
      updatedAt: new Date(),
    });
  }
  
  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }
  
  async findAll(limit?: number): Promise<T[]> {
    let query = this.collection.orderBy('createdAt', 'desc');
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const snapshot = await query.get();
    return this.mapSnapshot(snapshot);
  }
  
  async findWhere(field: string, operator: FirebaseFirestore.WhereFilterOp, value: any, limit?: number): Promise<T[]> {
    let query = this.collection.where(field, operator, value);
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const snapshot = await query.get();
    return this.mapSnapshot(snapshot);
  }
  
  async transaction<R>(operation: (transaction: Transaction) => Promise<R>): Promise<R> {
    return this.db.runTransaction(operation);
  }
  
  protected mapSnapshot(snapshot: QuerySnapshot): T[] {
    return snapshot.docs
      .map(doc => this.fromFirestore(doc))
      .filter((item): item is T => item !== null);
  }
  
  protected addTimestamps(data: any): any {
    const now = new Date();
    return {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
  }
}