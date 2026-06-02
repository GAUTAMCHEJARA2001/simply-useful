import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(10),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

const envResult = envSchema.safeParse(process.env);

if (!envResult.success) {
  console.error('❌ FATAL: Invalid Environment Variables');
  console.error(JSON.stringify(envResult.error.format(), null, 2));
  process.exit(1);
}

const env = envResult.data;

export default env;
export type Env = z.infer<typeof envSchema>;
