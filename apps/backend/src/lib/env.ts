import 'dotenv/config'
import { z } from 'zod'

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('*'),
  NANOBANANA_API_KEY: z.string().optional(),
  NANOBANANA_API_BASE_URL: z.string().default('https://api.nanobananaapi.ai/api/v1/nanobanana'),
  NANOBANANA_CALLBACK_URL: z.string().url().optional()
})

export const env = EnvSchema.parse(process.env)
