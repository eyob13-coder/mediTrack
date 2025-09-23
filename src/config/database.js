import { PrismaClient } from '@prisma/client'
import { DATABASE_URL, NODE_ENV} from '../config/env.js'

// Database connection with connection pooling for GCP
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  datasources: {
    db: {
      url: DATABASE_URL
    }
  },
  // Connection pool settings for Cloud SQL
  ...(NODE_ENV === 'production' && {
    // Production optimizations for GCP
    transactionOptions: {
      maxWait: 5000,
      timeout: 10000
    }
  })
})

// Connection health check
export const checkDatabaseHealth = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'connected', timestamp: new Date() }
  } catch (error) {
    return { status: 'disconnected', error: error.message }
  }
}

// Cleanup on application shutdown
export const shutdownDatabase = async () => {
  await prisma.$disconnect()
}

export default prisma