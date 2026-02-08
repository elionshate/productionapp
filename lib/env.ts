import { z } from 'zod';

/**
 * Environment Variable Validation with Zod
 * 
 * This provides runtime validation of environment variables to prevent
 * silent failures in production. All environment variables are validated
 * on application startup.
 * 
 * Usage:
 * import { env } from '@/lib/env';
 * console.log(env.DATABASE_URL);
 */

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Future: Add more environment variables as needed
  // SUPABASE_URL: z.string().url().optional(),
  // SUPABASE_ANON_KEY: z.string().optional(),
});

// Parse and validate environment variables
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  throw new Error('Invalid environment variables');
}

export const env = parsedEnv.data;

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;
