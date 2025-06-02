import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  
  // Firebase
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string(),
  
  // CORS
  CORS_ORIGIN: z.string().optional(),
});

const env = envSchema.parse(process.env);

export const config = {
  env: env.NODE_ENV,
  port: parseInt(env.PORT, 10),
  
  firebase: {
    projectId: env.FIREBASE_PROJECT_ID,
    credentialsPath: env.GOOGLE_APPLICATION_CREDENTIALS,
  },
  
  cors: {
    origin: env.CORS_ORIGIN || 'http://localhost:3000',
  },
};