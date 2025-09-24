import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import crypto from 'crypto'

// Security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  crossOriginEmbedderPolicy: false
})

// Rate limiting
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
})

export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
})

export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 webhooks per minute
  message: 'Too many webhook requests',
  standardHeaders: true,
  legacyHeaders: false
})

// Webhook signature verification
export const verifyWebhookSignature = (req, res, next) => {
  const signature = req.headers['x-webhook-signature']
  const payload = JSON.stringify(req.body)
  
  if (!signature) {
    return res.status(401).json({ error: 'Missing webhook signature' })
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid webhook signature' })
  }

  next()
}

// CORS configuration
export const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}