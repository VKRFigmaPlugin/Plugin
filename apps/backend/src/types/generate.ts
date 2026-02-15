import { z } from 'zod'
import { NanoBananaRecordInfoResponseSchema } from './nanobanana'

export const GenerateRequestSchema = z.object({
  title: z.string().min(1).max(120),
  price: z.string().min(1).max(30).optional(),
  features: z.array(z.string().min(1).max(80)).max(10).optional(),
  style: z.string().optional(),
  mode: z.enum(['background', 'compose']).default('background'),
  productImageUrl: z.string().url().optional(),
  callbackUrl: z.string().url().optional(),
  numImages: z.number().int().min(1).max(4).optional(),
  watermark: z.string().min(1).max(64).optional(),
  watermarkText: z.string().min(1).max(64).optional(),
  waitForResult: z.boolean().optional(),
  pollIntervalMs: z.number().int().min(1000).max(15000).optional(),
  maxWaitMs: z.number().int().min(5000).max(300000).optional()
})
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>

const GenerateBaseSuccessSchema = z.object({
  ok: z.literal(true),
  taskId: z.string(),
  prompt: z.string()
})

export const GenerateQueuedResponseSchema = GenerateBaseSuccessSchema.extend({
  state: z.literal('queued')
})
export type GenerateQueuedResponse = z.infer<typeof GenerateQueuedResponseSchema>

export const GenerateCompletedResponseSchema = GenerateBaseSuccessSchema.extend({
  state: z.literal('completed'),
  imageUrl: z.string().url(),
  status: NanoBananaRecordInfoResponseSchema.optional()
})
export type GenerateCompletedResponse = z.infer<typeof GenerateCompletedResponseSchema>

export const GenerateErrorStateSchema = z.enum([
  'validation_error',
  'config_error',
  'provider_error',
  'failed',
  'timeout'
])
export type GenerateErrorState = z.infer<typeof GenerateErrorStateSchema>

export const GenerateErrorResponseSchema = z.object({
  ok: z.literal(false),
  state: GenerateErrorStateSchema,
  error: z.string(),
  taskId: z.string().optional(),
  status: z.unknown().optional(),
  errors: z.unknown().optional(),
  detail: z.unknown().optional()
})
export type GenerateErrorResponse = z.infer<typeof GenerateErrorResponseSchema>

export const GenerateResponseSchema = z.union([
  GenerateQueuedResponseSchema,
  GenerateCompletedResponseSchema,
  GenerateErrorResponseSchema
])
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>
