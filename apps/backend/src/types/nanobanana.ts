import { z } from 'zod'

export const NanoBananaTaskTypeSchema = z.enum(['TEXTTOIAMGE', 'IMAGETOIAMGE'])
export type NanoBananaTaskType = z.infer<typeof NanoBananaTaskTypeSchema>

export const NanoBananaCreateResponseSchema = z.object({
  code: z.number().optional(),
  msg: z.string().optional(),
  data: z
    .object({
      taskId: z.string().min(1)
    })
    .optional()
})
export type NanoBananaCreateResponse = z.infer<typeof NanoBananaCreateResponseSchema>

export const NanoBananaRecordInfoDataSchema = z.object({
  taskId: z.string().optional(),
  paramJson: z.string().optional().nullable(),
  completeTime: z.string().optional().nullable(),
  response: z
    .object({
      originImageUrl: z.string().optional().nullable(),
      resultImageUrl: z.string().optional().nullable(),
      status: z.string().optional().nullable()
    })
    .optional()
    .nullable(),
  successFlag: z.union([z.number(), z.string()]).optional().nullable(),
  errorCode: z.union([z.number(), z.string()]).optional().nullable(),
  errorMessage: z.string().optional().nullable(),
  operationType: z.string().optional().nullable(),
  createTime: z.string().optional().nullable()
})
export type NanoBananaRecordInfoData = z.infer<typeof NanoBananaRecordInfoDataSchema>

export const NanoBananaRecordInfoResponseSchema = z.object({
  code: z.number().optional(),
  msg: z.string().optional(),
  data: NanoBananaRecordInfoDataSchema.optional()
})
export type NanoBananaRecordInfoResponse = z.infer<typeof NanoBananaRecordInfoResponseSchema>

export const NanoBananaCallbackPayloadSchema = z.object({
  code: z.number().optional(),
  msg: z.string().optional(),
  data: NanoBananaRecordInfoDataSchema.optional()
})
export type NanoBananaCallbackPayload = z.infer<typeof NanoBananaCallbackPayloadSchema>

export function normalizeSuccessFlag(value: NanoBananaRecordInfoData['successFlag']) {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? undefined : parsed
  }
  return undefined
}
