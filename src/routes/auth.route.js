import { Router } from 'express'
import { 
  register, 
  login, 
  logout, 
  refreshToken,
  patientRegister,

} from '../controllers/auth.controller.js'
import { validate, authValidation } from '../utils/validation.js'
import { authLimiter } from '../middleware/security.js'
import { authenticate } from '../middleware/auth.js'

const authRoutes = Router()

// Public routes
authRoutes.post('/register', authLimiter, validate(authValidation.register, 'body'), register)
authRoutes.post('/patient-register', authLimiter, validate(authValidation.patientRegister, 'body'), patientRegister) 
authRoutes.post('/login', authLimiter, validate(authValidation.login, 'body'), login)
authRoutes.post('/refresh-token', refreshToken)
authRoutes.post('/logout', logout)


// Protected routes

authRoutes.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user })
})

export default authRoutes
