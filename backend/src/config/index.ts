import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_never_use_in_prod',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4000/api',
  databaseUrl: process.env.DATABASE_URL,
};

export default config;
