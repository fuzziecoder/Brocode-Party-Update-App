import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(10),
  PORT: z.string().optional(),
  AUTH_TOKEN_SECRET: z.string().min(16).optional(),
  AUTH_TOKEN_TTL_SECONDS: z.string().regex(/^\d+$/).optional(),
  CORS_ALLOW_ORIGIN: z.string().optional(),
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS: z.string().regex(/^\d+$/).optional(),
  LOGIN_RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).optional(),
  LOGIN_RATE_LIMIT_BLOCK_MS: z.string().regex(/^\d+$/).optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('\n❌ Invalid environment configuration:\n');

  result.error.errors.forEach((err) => {
    console.error(`- ${err.path.join('.')}: ${err.message}`);
  });

  process.exit(1);
}

export default result.data;
