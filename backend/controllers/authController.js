const bcrypt = require('bcryptjs')
const User = require('../models/userModel')
const { generateToken } = require('../utils/jwt')

async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body

    const existing = await User.findByEmail(email)
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' })
    }

    const PUBLIC_ROLES = ['USER', 'RECRUITER']
    const requestedRole = (role || '').toUpperCase()
    if (!PUBLIC_ROLES.includes(requestedRole)) {
      return res.status(400).json({ success: false, message: 'Invalid role selected.' })
    }
    const assignedRole = requestedRole

    const salt   = await bcrypt.genSalt(12)
    const hashed = await bcrypt.hash(password, salt)

    const user = await User.create({
      name,
      email,
      password: hashed,
      role:     assignedRole,
      provider: 'LOCAL',
    })

    const token = generateToken({ id: user.id, email: user.email, role: user.role })

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id:         user.id,
        name:       user.name,
        email:      user.email,
        role:       user.role,
        provider:   user.provider,
        avatar:     user.avatar || null,
        created_at: user.created_at,
      },
    })
  } catch (err) {
    next(err)
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body

    const user = await User.findByEmail(email)
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    if (user.provider !== 'LOCAL') {
      const providerMessages = {
        GOOGLE: 'This account was created using Google. Please sign in with Google.',
        GITHUB: 'This account was created using GitHub. Please sign in with GitHub.',
      }
      return res.status(401).json({
        success: false,
        message: providerMessages[user.provider] || `This account uses ${user.provider} login. Please use the correct sign-in method.`,
      })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role })

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id:         user.id,
        name:       user.name,
        email:      user.email,
        role:       user.role,
        provider:   user.provider,
        avatar:     user.avatar || null,
        created_at: user.created_at,
      },
    })
  } catch (err) {
    next(err)
  }
}

async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    res.status(200).json({ success: true, user })
  } catch (err) {
    next(err)
  }
}

async function updateProfile(req, res, next) {
  try {
    const { name, email } = req.body

    const existing = await User.findByEmail(email)
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ success: false, message: 'Email already in use' })
    }

    const updated = await User.updateProfile(req.user.id, { name, email })
    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    res.status(200).json({ success: true, message: 'Profile updated', user: updated })
  } catch (err) {
    next(err)
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body

    const user = await User.findByEmail(req.user.email)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    if (user.provider === 'GOOGLE' || user.provider === 'GITHUB') {
      return res.status(400).json({
        success: false,
        message: 'Password change is not available for social login accounts',
      })
    }

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' })
    }

    const salt   = await bcrypt.genSalt(12)
    const hashed = await bcrypt.hash(newPassword, salt)
    await User.updatePassword(req.user.id, hashed)

    res.status(200).json({ success: true, message: 'Password updated successfully' })
  } catch (err) {
    next(err)
  }
}

async function logout(req, res) {
  res.status(200).json({ success: true, message: 'Logged out successfully' })
}

async function googleCallback(req, res) {
  try {
    const user  = req.user
    const token = generateToken({ id: user.id, email: user.email, role: user.role })
    const safeRole     = encodeURIComponent(user.role)
    const safeProvider = encodeURIComponent(user.provider || 'GOOGLE')
    const safeName     = encodeURIComponent(user.name   || '')
    const safeEmail    = encodeURIComponent(user.email  || '')
    const safeAvatar   = encodeURIComponent(user.avatar || '')
    const frontendUrl  = process.env.FRONTEND_URL || 'http://localhost:5173'
    res.redirect(
      `${frontendUrl}/oauth-callback?token=${token}&role=${safeRole}&provider=${safeProvider}&name=${safeName}&email=${safeEmail}&avatar=${safeAvatar}`
    )
  } catch (err) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    res.redirect(`${frontendUrl}/login?error=oauth_failed`)
  }
}

async function githubCallback(req, res) {
  try {
    const user  = req.user
    const token = generateToken({ id: user.id, email: user.email, role: user.role })
    const safeRole     = encodeURIComponent(user.role)
    const safeProvider = encodeURIComponent(user.provider || 'GITHUB')
    const safeName     = encodeURIComponent(user.name   || '')
    const safeEmail    = encodeURIComponent(user.email  || '')
    const safeAvatar   = encodeURIComponent(user.avatar || '')
    const frontendUrl  = process.env.FRONTEND_URL || 'http://localhost:5173'
    res.redirect(
      `${frontendUrl}/oauth-callback?token=${token}&role=${safeRole}&provider=${safeProvider}&name=${safeName}&email=${safeEmail}&avatar=${safeAvatar}`
    )
  } catch (err) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    res.redirect(`${frontendUrl}/login?error=oauth_failed`)
  }
}

module.exports = {
  register, login, getProfile, updateProfile,
  changePassword, logout, googleCallback, githubCallback,
}
