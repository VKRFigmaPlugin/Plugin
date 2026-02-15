import express from 'express'
import cors from 'cors'
import { env } from './lib/env.js'
import { healthRouter } from './routes/health'
import { generateRouter } from './routes/generate'
import { nanoBananaRouter } from './routes/nanobanana'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
      credentials: true
    })
  )
  app.use(express.json({ limit: '5mb' }))

  app.use('/api', healthRouter)
  app.use('/api', generateRouter)
  app.use('/api', nanoBananaRouter)

  return app
}
