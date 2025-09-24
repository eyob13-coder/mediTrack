import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import {JWT_SECRET} from '../config/env.js'



export async function authenticate(req, res, next) {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ error: 'Missing authorization' })
  const token = auth.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Malformed token' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user) return res.status(401).json({ error: 'Invalid user' })
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId
    }
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token', details: err.message })
  }
}

export function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}