import { Router } from 'express'
import { z } from 'zod'

export const generateRouter = Router()

const GenerateRequestSchema = z.object({
  title: z.string().min(1).max(120),
  price: z.string().min(1).max(30).optional(),
  features: z.array(z.string().min(1).max(80)).max(10).optional(),
  style: z.string().optional(),
  mode: z.enum(['background', 'compose']).default('background'),
  productImageUrl: z.string().url().optional()
})

generateRouter.post('/generate', async (req, res) => {
  const parsed = GenerateRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, errors: parsed.error.flatten() })
  }

  const { title, style, mode } = parsed.data

  return res.json({
    ok: true,
    message: 'stub generate endpoint',
    input: { title, style, mode },
    imageUrl: null
  })
})
