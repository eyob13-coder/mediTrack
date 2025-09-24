import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { createServer } from 'http'
import prisma from './config/database.js'

// import { initializeSocket } from './services/socketService.js'
// import { languageMiddleware } from './middleware/language.js'

// Import routes
import authRoutes from './routes/auth.route.js'
// import tenantRoutes from './routes/tenants.js'
// import pharmacyRoutes from './routes/pharmacies.js'
// import inventoryRoutes from './routes/inventory.js'
// import orderRoutes from './routes/orders.js'
// import billingRoutes from './routes/billing.js'
// import analyticsRoutes from './routes/analytics.js'
// import chatRoutes from './routes/chat.js'
// import languageRoutes from './routes/language.js'
// import ethiopianRoutes from './routes/ethiopian.js'

// import { securityHeaders, apiLimiter } from './middleware/security.js'
// import { authenticate } from './middleware/auth.js'

prisma.$connect()
  .then(() => {
    console.log('✅  Connected to database')
  })
  .catch((error) => {
    console.error('❌  Error connecting to database:', error)
  })

const app = express()
const server = createServer(app)

// Initialize WebSocket with African language support
// initializeSocket(server)

// Middleware
// app.use(securityHeaders)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(cookieParser())
app.use(express.json({ limit: '1mb' }))
app.use(morgan('combined'))
// app.use(languageMiddleware)

// Apply rate limiting
// app.use('/api/', apiLimiter)

// Routes
app.get('/', (req, res) => {
  res.json({ 
    ok: true, 
    name: 'MedicTrack API',
    message: req.t('common.welcome'),
    // supportedLanguages: Object.keys(SUPPORTED_LANGUAGES)
  })
})

app.use('/api/v1/auth', authRoutes)
// app.use('/api/tenants', authenticate, tenantRoutes)
// app.use('/api/pharmacies', authenticate, pharmacyRoutes)
// app.use('/api/inventory', authenticate, inventoryRoutes)
// app.use('/api/orders', authenticate, orderRoutes)
// app.use('/api/billing', authenticate, billingRoutes)
// app.use('/api/analytics', authenticate, analyticsRoutes)
// app.use('/api/chat', authenticate, chatRoutes)
// app.use('/api/language', languageRoutes)
// app.use('/api/ethiopian', ethiopianRoutes) // Ethiopian-specific routes

// Health check with language support
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    language: req.language,
    message: req.t('success.operation_completed'),
    region: 'Africa'
  })
})

const PORT = process.env.PORT || 4000
server.listen(PORT, () => {
  console.log(`🚀 MedicTrack API running on port ${PORT}`)
//   console.log(`🌍 Supported languages: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}`)
//   console.log(`🇪🇹 Ethiopian languages: am, om, ti, so`)
})