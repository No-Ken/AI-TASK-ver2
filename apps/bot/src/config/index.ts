import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('8080'),
  
  // LINE
  LINE_CHANNEL_ACCESS_TOKEN: z.string(),
  LINE_CHANNEL_SECRET: z.string(),
  LIFF_ID: z.string(),
  
  // Firebase
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string(),
  
  // Google AI
  GEMINI_API_KEY: z.string(),
  
  // App URLs
  BOT_WEBHOOK_URL: z.string().url(),
  LIFF_APP_URL: z.string().url(),
});

const env = envSchema.parse(process.env);

export const config = {
  env: env.NODE_ENV,
  port: parseInt(env.PORT, 10),
  
  line: {
    channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: env.LINE_CHANNEL_SECRET,
    liffId: env.LIFF_ID,
  },
  
  firebase: {
    projectId: env.FIREBASE_PROJECT_ID,
    credentialsPath: env.GOOGLE_APPLICATION_CREDENTIALS,
  },
  
  googleAI: {
    geminiApiKey: env.GEMINI_API_KEY,
  },
  
  urls: {
    webhook: env.BOT_WEBHOOK_URL,
    liffApp: env.LIFF_APP_URL,
  },
};