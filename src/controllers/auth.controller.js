import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { User } from '../models/User.js'
import { JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_SECRET } from '../config/env.js'
import prisma from '../config/database.js'

export const register = async (req, res) => {
  try {
    const { tenantName, email, password, name, role, language = 'en' } = req.body

    // Validate required fields
    if (!tenantName || !email || !password || !name) {
      return res.status(400).json({
        error: 'Missing required fields: tenantName, email, password, name'
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' })
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: { name: tenantName }
    })

    // Create user
    const userResult = await User.create({
      email,
      password,
      name,
      role: role || 'WORKER',
      language,
      tenantId: tenant.id
    })

    if (!userResult.success) {
      await prisma.tenant.delete({ where: { id: tenant.id } })
      return res.status(400).json({ error: userResult.error })
    }

    const user = userResult.user

    const accessToken = jwt.sign(
      { sub: user.id, tenantId: tenant.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    const refreshToken = jwt.sign(
      { sub: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    )

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

    res.json({
      accessToken,
      user,
      message: 'Registration successful'
    })

  } catch (err) {
    console.error('Registration error:', err)

    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' })
    }

    res.status(500).json({
      error: 'Server error during registration',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    })
  }
}

export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const userResult = await User.findByEmail(email)

    if (!userResult.success || !userResult.user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const user = userResult.user

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

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

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken,
        lastLoginAt: new Date()
      }
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
    res.status(500).json({
      error: 'Server error during login',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    })
  }
}

export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' })
    }

    let payload
    try {
      payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET)
    } catch (err) {
      return res.status(401).json({ error: 'Invalid refresh token' }, err)
    }

    const user = await prisma.user.findFirst({
      where: {
        id: payload.sub,
        refreshToken
      }
    })

    if (!user) {
      return res.status(401).json({ error: 'Invalid refresh token' })
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' })
    }

    const newAccessToken = jwt.sign(
      { sub: user.id, tenantId: user.tenantId, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    res.json({
      accessToken: newAccessToken,
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

export const updateLanguage = async (req, res) => {
  try {
    const { language } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    if (!language) {
      return res.status(400).json({ error: 'Language is required' })
    }

    const updateResult = await User.update(userId, { language })

    if (!updateResult.success) {
      return res.status(400).json({ error: updateResult.error })
    }

    res.json({
      success: true,
      user: updateResult.user,
      message: 'Language updated successfully'
    })

  } catch (error) {
    console.error('Language update error:', error)
    res.status(500).json({
      error: 'Server error during language update',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken

    if (refreshToken) {
      try {
        const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET)
        await prisma.user.update({
          where: { id: payload.sub },
          data: { refreshToken: null }
        })
      } catch (jwtError) {
        console.log('Invalid token during logout:', jwtError.message)
      }
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    })

    res.json({ message: 'Logged out successfully' })

  } catch (error) {
    console.error('Logout error:', error)
    res.clearCookie('refreshToken')
    res.json({ message: 'Logged out successfully' })
  }
}

export const getMe = async (req, res) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    const userResult = await User.findById(userId)

    if (!userResult.success || !userResult.user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      user: userResult.user
    })

  } catch (error) {
    console.error('Get me error:', error)
    res.status(500).json({
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
