import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('8081'),
  
  // LINE
  LINE_CHANNEL_ACCESS_TOKEN: z.string(),
  
  // Firebase
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string(),
});

const env = envSchema.parse(process.env);

export const config = {
  env: env.NODE_ENV,
  port: parseInt(env.PORT, 10),
  
  line: {
    channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
  },
  
  firebase: {
    projectId: env.FIREBASE_PROJECT_ID,
    credentialsPath: env.GOOGLE_APPLICATION_CREDENTIALS,
  },
};