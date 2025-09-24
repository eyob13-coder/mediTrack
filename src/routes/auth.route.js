import { Router } from 'express'
import { 
  register, 
  login, 
  logout, 
  refreshToken,

} from '../controllers/auth.controller.js'
import { validate, authValidation } from '../utils/validation.js'
import { authLimiter } from '../middleware/security.js'
import { authenticate } from '../middleware/auth.js'

const authRoutes = Router()

// Public routes
authRoutes.post('/register', authLimiter, validate(authValidation.register), register)
authRoutes.post('/login', authLimiter, validate(authValidation.login), login)
authRoutes.post('/refresh-token', refreshToken)
authRoutes.post('/logout', logout)


// Protected routes

authRoutes.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user })
})

export default authRoutes
