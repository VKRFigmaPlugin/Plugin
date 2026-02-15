import { Router } from 'express'
import { logger } from '../lib/logger'
import { NanoBananaCallbackPayloadSchema } from '../types/nanobanana'

export const nanoBananaRouter = Router()

nanoBananaRouter.post('/nanobanana/callback', (req, res) => {
  const parsed = NanoBananaCallbackPayloadSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, errors: parsed.error.flatten() })
  }

  const payload = parsed.data
  logger.info({ payload }, 'Nano Banana callback received')

  return res.json({ ok: true })
})
