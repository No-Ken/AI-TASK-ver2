export const PLAN_LIMITS = {
  free: {
    apiCallsPerDay: 50,
    apiCallsPerMonth: 1000,
    groupsLimit: 3,
    warikanLimit: 10,
    scheduleLimit: 20,
    storageLimit: 100 * 1024 * 1024, // 100MB
  },
  minimum: {
    apiCallsPerDay: 200,
    apiCallsPerMonth: 5000,
    groupsLimit: 10,
    warikanLimit: 50,
    scheduleLimit: 100,
    storageLimit: 500 * 1024 * 1024, // 500MB
  },
  businessman: {
    apiCallsPerDay: 500,
    apiCallsPerMonth: 15000,
    groupsLimit: 30,
    warikanLimit: 200,
    scheduleLimit: 500,
    storageLimit: 2 * 1024 * 1024 * 1024, // 2GB
  },
  pro: {
    apiCallsPerDay: 1000,
    apiCallsPerMonth: 30000,
    groupsLimit: 100,
    warikanLimit: 1000,
    scheduleLimit: 2000,
    storageLimit: 10 * 1024 * 1024 * 1024, // 10GB
  },
  enterprise: {
    apiCallsPerDay: 10000,
    apiCallsPerMonth: 300000,
    groupsLimit: -1, // Unlimited
    warikanLimit: -1,
    scheduleLimit: -1,
    storageLimit: -1,
  },
} as const;

export const ERROR_CODES = {
  // Authentication
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_EXPIRED_TOKEN: 'AUTH_EXPIRED_TOKEN',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  
  // Resource
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  
  // System
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export const SUPPORTED_LANGUAGES = ['ja', 'en'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const CURRENCIES = {
  JPY: { symbol: '¥', decimals: 0 },
  USD: { symbol: '$', decimals: 2 },
  EUR: { symbol: '€', decimals: 2 },
} as const;

export const DEFAULT_TIMEZONE = 'Asia/Tokyo';