import { Router } from 'express'
import { z } from 'zod'
import { env } from '../lib/env'
import { GenerateRequestSchema, type GenerateRequest } from '../types/generate'
import {
  NanoBananaCreateResponseSchema,
  NanoBananaRecordInfoResponseSchema,
  normalizeSuccessFlag
} from '../types/nanobanana'

export const generateRouter = Router()

const MockGenerateRequestSchema = GenerateRequestSchema.extend({
  mockState: z.enum(['completed', 'failed', 'processing']).default('completed'),
  mockImageUrl: z.string().url().optional(),
  mockErrorMessage: z.string().optional()
})

function buildPrompt(
  input: Pick<GenerateRequest, 'title' | 'price' | 'features' | 'style' | 'mode'>
) {
  const parts = [
    `Product: ${input.title}`,
    input.price ? `Price: ${input.price}` : null,
    input.features?.length ? `Features: ${input.features.join(', ')}` : null,
    input.style ? `Style: ${input.style}` : null,
    input.mode === 'compose'
      ? 'Compose a clean marketplace card around the provided product photo.'
      : 'Create a clean marketplace card with a simple, neutral background.'
  ].filter(Boolean)
  return parts.join('. ')
}

function formatNanoBananaDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

generateRouter.post('/generate/mock', async (req, res) => {
  const parsed = MockGenerateRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      state: 'validation_error',
      error: 'Invalid generate mock request',
      errors: parsed.error.flatten()
    })
  }

  const {
    title,
    price,
    features,
    style,
    mode,
    productImageUrl,
    callbackUrl,
    numImages,
    watermark,
    watermarkText,
    mockState,
    mockImageUrl,
    mockErrorMessage
  } = parsed.data

  if (mode === 'compose' && !productImageUrl) {
    return res.status(400).json({
      ok: false,
      state: 'validation_error',
      error: 'productImageUrl is required when mode is compose'
    })
  }

  const taskId = `mock_${Date.now()}`
  const prompt = buildPrompt({ title, price, features, style, mode })
  const createdAt = new Date()
  const completedAt = new Date(createdAt.getTime() + 8000)
  const requestType = mode === 'compose' ? 'IMAGETOIAMGE' : 'TEXTTOIAMGE'
  const resolvedWatermark = watermarkText ?? watermark
  const resultImageUrl =
    mockImageUrl ??
    'https://tempfile.aiquickdraw.com/workers/nano/image_mock_1771158326282_plx4ti.png'

  const successFlag = mockState === 'completed' ? 1 : mockState === 'failed' ? 2 : 0
  const errorMessage =
    mockState === 'failed' ? (mockErrorMessage ?? 'Mock Banana generation failed') : null
  const response =
    mockState === 'completed'
      ? {
          originImageUrl: productImageUrl ?? null,
          resultImageUrl
        }
      : {
          originImageUrl: productImageUrl ?? null,
          resultImageUrl: null
        }

  const statusPayload = {
    code: 200,
    msg: 'success',
    data: {
      taskId,
      paramJson: JSON.stringify({
        callBackUrl:
          callbackUrl ??
          env.NANOBANANA_CALLBACK_URL ??
          'https://example.com/api/nanobanana/callback',
        numImages: numImages ?? 1,
        prompt,
        type: requestType,
        watermark: resolvedWatermark,
        imageUrls: mode === 'compose' ? [productImageUrl] : undefined
      }),
      completeTime: mockState === 'processing' ? null : formatNanoBananaDate(completedAt),
      response,
      successFlag,
      errorCode: mockState === 'failed' ? 'MOCK_FAILED' : null,
      errorMessage,
      operationType: `nanobanana_${requestType}`,
      createTime: formatNanoBananaDate(createdAt)
    }
  }

  if (mockState === 'completed') {
    return res.json({
      ok: true,
      state: 'completed',
      taskId,
      prompt,
      imageUrl: resultImageUrl,
      status: statusPayload
    })
  }

  if (mockState === 'failed') {
    return res.status(502).json({
      ok: false,
      state: 'failed',
      taskId,
      error: errorMessage ?? 'Mock Banana generation failed',
      status: statusPayload
    })
  }

  return res.status(202).json({
    ok: false,
    state: 'timeout',
    taskId,
    error: 'Timed out waiting for Nano Banana result',
    status: statusPayload
  })
})

generateRouter.post('/generate', async (req, res) => {
  const parsed = GenerateRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      state: 'validation_error',
      error: 'Invalid generate request',
      errors: parsed.error.flatten()
    })
  }

  if (!env.NANOBANANA_API_KEY) {
    return res.status(500).json({
      ok: false,
      state: 'config_error',
      error: 'NANOBANANA_API_KEY is not configured'
    })
  }

  const {
    title,
    price,
    features,
    style,
    mode,
    productImageUrl,
    callbackUrl,
    numImages,
    watermark,
    watermarkText,
    waitForResult,
    pollIntervalMs,
    maxWaitMs
  } = parsed.data

  const resolvedCallbackUrl = callbackUrl ?? env.NANOBANANA_CALLBACK_URL
  if (!resolvedCallbackUrl) {
    return res.status(400).json({
      ok: false,
      state: 'validation_error',
      error: 'callbackUrl is required (or set NANOBANANA_CALLBACK_URL)'
    })
  }

  if (mode === 'compose' && !productImageUrl) {
    return res.status(400).json({
      ok: false,
      state: 'validation_error',
      error: 'productImageUrl is required when mode is compose'
    })
  }

  const prompt = buildPrompt({ title, price, features, style, mode })
  const resolvedWatermark = watermarkText ?? watermark
  const requestBody: Record<string, unknown> = {
    prompt,
    callBackUrl: resolvedCallbackUrl,
    numImages: numImages ?? 1,
    watermark: resolvedWatermark,
    type: mode === 'compose' ? 'IMAGETOIAMGE' : 'TEXTTOIAMGE'
  }

  if (mode === 'compose' && productImageUrl) {
    requestBody.imageUrls = [productImageUrl]
  }

  let createResponse: Response
  try {
    createResponse = await fetch(`${env.NANOBANANA_API_BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.NANOBANANA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
  } catch (error) {
    return res.status(502).json({
      ok: false,
      state: 'provider_error',
      error: 'Failed to reach Nano Banana API',
      detail: error instanceof Error ? error.message : String(error)
    })
  }

  const createJson = await createResponse.json().catch(() => null)
  if (!createResponse.ok) {
    return res.status(502).json({
      ok: false,
      state: 'provider_error',
      error: 'Nano Banana API returned an error',
      detail: createJson
    })
  }

  const createParsed = NanoBananaCreateResponseSchema.safeParse(createJson)
  if (
    createParsed.success &&
    typeof createParsed.data.code === 'number' &&
    createParsed.data.code !== 200
  ) {
    return res.status(502).json({
      ok: false,
      state: 'provider_error',
      error: 'Nano Banana API returned a non-success code',
      detail: createParsed.data
    })
  }
  const taskId = createParsed.success ? createParsed.data.data?.taskId : undefined
  if (!taskId) {
    return res.status(502).json({
      ok: false,
      state: 'provider_error',
      error: 'Nano Banana API did not return a taskId',
      detail: createJson
    })
  }

  if (!waitForResult) {
    return res.json({
      ok: true,
      state: 'queued',
      taskId,
      prompt
    })
  }

  const pollEvery = pollIntervalMs ?? 3000
  const maxWait = maxWaitMs ?? 120000
  const start = Date.now()
  let statusPayload: unknown = null

  while (Date.now() - start < maxWait) {
    await sleep(pollEvery)

    const statusResponse = await fetch(
      `${env.NANOBANANA_API_BASE_URL}/record-info?taskId=${encodeURIComponent(taskId)}`,
      {
        headers: {
          Authorization: `Bearer ${env.NANOBANANA_API_KEY}`
        }
      }
    ).catch(() => null)

    if (!statusResponse || !statusResponse.ok) {
      continue
    }

    statusPayload = await statusResponse.json().catch(() => null)
    const statusParsed = NanoBananaRecordInfoResponseSchema.safeParse(statusPayload)
    if (!statusParsed.success) {
      continue
    }

    const statusData = statusParsed.data.data
    const successFlag = normalizeSuccessFlag(statusData?.successFlag)
    const resultUrl =
      typeof statusData?.response?.resultImageUrl === 'string' &&
      statusData.response.resultImageUrl.length > 0
        ? statusData.response.resultImageUrl
        : undefined

    if (successFlag === 1 && resultUrl) {
      return res.json({
        ok: true,
        state: 'completed',
        taskId,
        prompt,
        imageUrl: resultUrl,
        status: statusParsed.data
      })
    }

    if (successFlag === 2 || successFlag === 3) {
      return res.status(502).json({
        ok: false,
        state: 'failed',
        taskId,
        error: statusData?.errorMessage ?? 'Nano Banana generation failed',
        status: statusParsed.data
      })
    }
  }

  return res.status(202).json({
    ok: false,
    state: 'timeout',
    taskId,
    error: 'Timed out waiting for Nano Banana result',
    status: statusPayload
  })
})
