import { Firestore } from '@google-cloud/firestore';

export interface DatabaseConfig {
  projectId: string;
  keyFilename?: string;
  emulator?: {
    host: string;
    port: number;
  };
}

export class Database {
  private static instance: Firestore;
  
  static initialize(config: DatabaseConfig): void {
    if (config.emulator) {
      process.env.FIRESTORE_EMULATOR_HOST = `${config.emulator.host}:${config.emulator.port}`;
    }
    
    this.instance = new Firestore({
      projectId: config.projectId,
      keyFilename: config.keyFilename,
    });
  }
  
  static getInstance(): Firestore {
    if (!this.instance) {
      throw new Error('Database not initialized. Call Database.initialize() first.');
    }
    return this.instance;
  }
}