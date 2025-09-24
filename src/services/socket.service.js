import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import prisma from '../config/database.js'

let io = null

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ["GET", "POST"]
    }
  })

  io.use(authenticateSocket)
  io.on('connection', handleConnection)

  return io
}

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token
    const payload = jwt.verify(token, process.env.JWT_SECRET)

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, tenantId: true, role: true, isActive: true }
    })

    if (!user || !user.isActive) {
      return next(new Error('User not found or inactive'))
    }

    socket.userId = user.id
    socket.tenantId = user.tenantId
    socket.role = user.role
    socket.language = 'en' // force English
    next()
  } catch (error) {
    next(new Error('Authentication error'),error)
  }
}

const handleConnection = (socket) => {
  console.log(`User ${socket.userId} connected (Language: ${socket.language})`)

  socket.join(`tenant:${socket.tenantId}`)
  socket.join(`user:${socket.userId}`)

  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`)
  })
}

// Send notification to a specific user
export const sendTranslatedNotification = (userId, type, data = {}) => {
  if (!io) return

  io.to(`user:${userId}`).emit('notification', {
    id: generateId(),
    type,
    message: data.message || '',
    data,
    timestamp: new Date().toISOString(),
    language: 'en'
  })
}

// Broadcast notification to a tenant
export const broadcastToTenant = (tenantId, type, data = {}) => {
  if (!io) return

  io.in(`tenant:${tenantId}`).emit('tenant-notification', {
    id: generateId(),
    type,
    message: data.message || '',
    data,
    timestamp: new Date().toISOString(),
    language: 'en'
  })
}

const generateId = () => {
  return Math.random().toString(36).substr(2, 9)
}

export const getIO = () => io
