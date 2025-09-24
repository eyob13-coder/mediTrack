import { Router } from 'express'
import { 
  register, 
  login, 
  logout, 
  refreshToken,
//   inviteUser,
//   verifyEmail 
} from '../controllers/auth.controller.js'
// import { validate } from '../utils/validation.js'
// import { authValidation } from '../utils/validation.js'
// import { authLimiter } from '../middleware/security.js'
// import { authenticate, optionalAuth } from '../middleware/auth.js'

const authRoutes = Router()

// Public routes

authRoutes.post('/register', register)
authRoutes.post('/login', login)
authRoutes.post('/refresh-token', refreshToken)
authRoutes.post('/logout', logout)

// router.post('/verify-email', verifyEmail)

// Protected routes
// router.post('/invite', authenticate, validate(authValidation.invite), inviteUser)
// router.get('/me', authenticate, (req, res) => {
//   res.json({ user: req.user })
// })

export default authRoutes