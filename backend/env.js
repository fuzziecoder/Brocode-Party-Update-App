import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_PATH = resolve(process.cwd(), '.env');

const parseEnvLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const separatorIndex = trimmed.indexOf('=');
  if (separatorIndex < 0) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
};

const loadDotEnv = () => {
  if (!existsSync(ENV_PATH)) {
    return;
  }

  const contents = readFileSync(ENV_PATH, 'utf-8');
  contents.split(/\r?\n/).forEach((line) => {
    const parsed = parseEnvLine(line);
    if (!parsed || process.env[parsed.key] !== undefined) {
      return;
    }

    process.env[parsed.key] = parsed.value;
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
  REDIS_URL: z.string().url().optional(),
  REDIS_KEY_PREFIX: z.string().optional(),
  CACHE_DEFAULT_TTL_SECONDS: z.string().regex(/^\d+$/).optional(),
  PRESENCE_TTL_SECONDS: z.string().regex(/^\d+$/).optional(),
  EVENT_STATE_DEFAULT_TTL_SECONDS: z.string().regex(/^\d+$/).optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('\n❌ Invalid environment configuration:\n');

  result.error.errors.forEach((err) => {
    console.error(`- ${err.path.join('.')}: ${err.message}`);
  });
};

const isIntegerString = (value) => typeof value === 'string' && /^\d+$/.test(value);

const validateEnv = () => {
  const errors = [];
  const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = process.env;

  if (!VITE_SUPABASE_URL) {
    errors.push('VITE_SUPABASE_URL is required');
  } else {
    try {
      new URL(VITE_SUPABASE_URL);
    } catch {
      errors.push('VITE_SUPABASE_URL must be a valid URL');
    }
  }

  if (!VITE_SUPABASE_ANON_KEY || VITE_SUPABASE_ANON_KEY.length < 10) {
    errors.push('VITE_SUPABASE_ANON_KEY is required and must be at least 10 characters');
  }

  const numericKeys = [
    'AUTH_TOKEN_TTL_SECONDS',
    'LOGIN_RATE_LIMIT_MAX_ATTEMPTS',
    'LOGIN_RATE_LIMIT_WINDOW_MS',
    'LOGIN_RATE_LIMIT_BLOCK_MS',
    'REDIS_PORT',
  ];

  numericKeys.forEach((key) => {
    const value = process.env[key];
    if (value !== undefined && !isIntegerString(value)) {
      errors.push(`${key} must be an integer string`);
    }
  });

  if (process.env.AUTH_TOKEN_SECRET && process.env.AUTH_TOKEN_SECRET.length < 16) {
    errors.push('AUTH_TOKEN_SECRET must be at least 16 characters when provided');
  }

  if (errors.length > 0) {
    console.error('\n❌ Invalid environment configuration:\n');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }
};

loadDotEnv();
validateEnv();

export default process.env;
