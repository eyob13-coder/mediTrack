import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import prisma from '../config/database.js'
import { JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_SECRET } from '../config/env.js'

// ---------- Helper to create JWT ----------
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { sub: user.id, tenantId: user.tenantId, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )

  const refreshToken = jwt.sign(
    { sub: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  )

  return { accessToken, refreshToken }
}

// ---------- Register (for pharmacy/clinic staff/owner) ----------
export const register = async (req, res) => {
  try {
    const { tenantName, email, password, name, role, language = 'en' } = req.body

    if (!tenantName || !email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields: tenantName, email, password, name' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: { name: tenantName }
    })

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        password: hashedPassword,
        name,
        role: role || 'WORKER',
        language,
        isActive: true,
        emailVerified: false
      }
    })

    const { accessToken, refreshToken } = generateTokens(user)

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    })

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.json({ accessToken, user, message: 'Registration successful' })
  } catch (err) {
    console.error('Registration error:', err)
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' })
    }
    res.status(500).json({ error: 'Server error during registration' })
  }
}

// ---------- Patient Register ----------
export const patientRegister = async (req, res) => {
  try {
    const { email, password, name, phone, language = 'en' } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields: email, password, name' })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    const tenant = await prisma.tenant.create({
      data: {
        name: `${name}'s Patient Tenant`,
        defaultLanguage: language,
        plan: 'FREE',
        subscriptionStatus: 'ACTIVE'
      }
    })

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        password: hashedPassword,
        name,
        phone,
        role: 'CUSTOMER',
        language,
        isActive: true,
        emailVerified: false
      }
    })

    const { accessToken, refreshToken } = generateTokens(user)

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    })

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.status(201).json({ accessToken, user, message: 'Patient registration successful' })
  } catch (err) {
    console.error('Patient registration error:', err)
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' })
    }
    res.status(500).json({ error: 'Server error during patient registration' })
  }
}

// ---------- Login ----------
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const { accessToken, refreshToken } = generateTokens(user)

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken, lastLoginAt: new Date() }
    })

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        language: user.language
      },
      message: 'Login successful'
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Server error during login' })
  }
}

// ---------- Refresh Token ----------
export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken
    if (!token) return res.status(401).json({ error: 'Refresh token required' })

    let payload
    try {
      payload = jwt.verify(token, JWT_REFRESH_SECRET)
    } catch {
      return res.status(401).json({ error: 'Invalid refresh token' })
    }

    const user = await prisma.user.findFirst({
      where: { id: payload.sub, refreshToken: token }
    })
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive user' })
    }

    const { accessToken } = generateTokens(user)

    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        language: user.language
      }
    })
  } catch (err) {
    console.error('Refresh token error:', err)
    res.status(401).json({ error: 'Invalid refresh token' })
  }
}

// ---------- Logout ----------
export const logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken
    if (token) {
      try {
        const payload = jwt.verify(token, JWT_REFRESH_SECRET)
        await prisma.user.update({
          where: { id: payload.sub },
          data: { refreshToken: null }
        })
      } catch (err) {
        console.log('Invalid token during logout:', err.message)
      }
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    })

    res.json({ message: 'Logged out successfully' })
  } catch (err) {
    console.error('Logout error:', err)
    res.clearCookie('refreshToken')
    res.json({ message: 'Logged out successfully' })
  }
}

// ---------- Get Current User ----------
export const getMe = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'User not authenticated' })

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    res.json({ user })
  } catch (err) {
    console.error('Get me error:', err)
    res.status(500).json({ error: 'Server error' })
  }
}

// ---------- Update Language ----------
export const updateLanguage = async (req, res) => {
  try {
    const { language } = req.body
    const userId = req.user?.id

    if (!userId) return res.status(401).json({ error: 'User not authenticated' })
    if (!language) return res.status(400).json({ error: 'Language is required' })

    const user = await prisma.user.update({
      where: { id: userId },
      data: { language }
    })

    res.json({ success: true, user, message: 'Language updated successfully' })
  } catch (err) {
    console.error('Language update error:', err)
    res.status(500).json({ error: 'Server error during language update' })
  }
}
