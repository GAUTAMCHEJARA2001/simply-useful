import pino from 'pino';
import env from './env';

/**
 * ELITE PINO LOGGER (10/10)
 * Features: 
 * - Environment-aware transport (Pretty vs JSON)
 * - Error stack trace persistence
 * - Standardized logging levels
 */

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: {
    service: 'simply-useful-api',
    env: env.NODE_ENV,
  },
  transport: env.NODE_ENV !== 'production' 
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      } 
    : undefined,
});
