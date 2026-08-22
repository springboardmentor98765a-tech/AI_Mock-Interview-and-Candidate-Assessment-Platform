const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const router = express.Router();

// Simple in-memory store for OAuth state
const oauthStateStore = {};

// =============================================
// PASSPORT GOOGLE STRATEGY
// =============================================
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:5000/api/oauth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('🔍 Google Profile received:', profile.id);
        console.log('📧 Email:', profile.emails?.[0]?.value);
        console.log('📛 Name:', profile.displayName);

        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in Google profile'), null);
        }

        const name = profile.displayName || email.split('@')[0];
        
        // Check if user exists
        let user = await User.findByEmail(email);
        console.log('🔍 User found in DB:', user ? 'Yes' : 'No');

        if (!user) {
          // Create new user with default role
          user = await User.create({
            name: name,
            email: email,
            password: null,
            role: 'USER',
            provider: 'GOOGLE',
          });
          console.log('✅ New Google user created with role: USER');
        } else {
          console.log('✅ Existing Google user found with role:', user.role);
        }

        return done(null, user);
      } catch (error) {
        console.error('❌ Google Strategy Error:', error);
        return done(error, null);
      }
    }
  )
);

// =============================================
// ROUTE 1: START GOOGLE OAUTH
// =============================================
router.get('/google', (req, res, next) => {
  const role = req.query.role || 'USER';
  console.log('🔑 Google OAuth started with role:', role);
  
  // Generate a random state to track this request
  const state = Math.random().toString(36).substring(7);
  
  // Store the role with the state
  oauthStateStore[state] = { role, timestamp: Date.now() };
  
  console.log('📝 Stored role for state:', state, '->', role);
  
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: state,
  })(req, res, next);
});

// =============================================
// ROUTE 2: GOOGLE OAUTH CALLBACK
// =============================================
router.get('/google/callback', (req, res, next) => {
  console.log('🔄 Google OAuth callback received');
  
  const state = req.query.state;
  console.log('📝 State received:', state);
  
  // Get the role from our store
  let role = 'USER';
  if (state && oauthStateStore[state]) {
    role = oauthStateStore[state].role;
    console.log('📝 Found role in store:', role);
    // Clean up the store
    delete oauthStateStore[state];
  } else {
    console.log('⚠️ No role found in store, using default: USER');
  }
  
  passport.authenticate('google', { session: false }, async (err, user, info) => {
    console.log('📝 Passport authenticate callback');
    console.log('User:', user?.email);
    console.log('Role from store:', role);
    
    if (err) {
      console.error('❌ Authentication error:', err);
      return res.redirect(`http://localhost:3000/login?error=${encodeURIComponent(err.message)}`);
    }
    
    if (!user) {
      console.error('❌ No user returned');
      return res.redirect('http://localhost:3000/login?error=no_user');
    }
    
    try {
      let finalUser = user;
      
      // Update user role if needed
      if (role !== user.role) {
        console.log('🔄 Updating user role from', user.role, 'to', role);
        
        // Update in database - FIXED: await the result
        const updatedUser = await User.update(user.id, { role });
        
        if (updatedUser) {
          finalUser = updatedUser;
          console.log('✅ User role updated to:', finalUser.role);
        } else {
          console.log('⚠️ Failed to update role, using existing user');
          finalUser = user;
        }
      } else {
        console.log('✅ User role already correct:', user.role);
      }
      
      // Generate JWT with the (possibly updated) role
      const token = jwt.sign(
        { 
          id: finalUser.id, 
          email: finalUser.email, 
          role: finalUser.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRY || '7d' }
      );
      
      console.log('✅ JWT generated for user with role:', finalUser.role);
      
      // Redirect to frontend
      const frontendUrl = `http://localhost:3000/auth/google/callback?token=${token}&user=${encodeURIComponent(
        JSON.stringify({
          id: finalUser.id,
          name: finalUser.name,
          email: finalUser.email,
          role: finalUser.role,
          provider: finalUser.provider,
        })
      )}`;
      
      console.log('🔄 Redirecting to frontend with role:', finalUser.role);
      res.redirect(frontendUrl);
      
    } catch (error) {
      console.error('❌ Callback processing error:', error);
      // Generate JWT with original user role if update fails
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRY || '7d' }
      );
      
      const frontendUrl = `http://localhost:3000/auth/google/callback?token=${token}&user=${encodeURIComponent(
        JSON.stringify({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          provider: user.provider,
        })
      )}`;
      
      res.redirect(frontendUrl);
    }
  })(req, res, next);
});

// =============================================
// ROUTE 3: UPDATE USER ROLE
// =============================================
router.post('/update-role', async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    const validRoles = ['USER', 'RECRUITER', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await User.update(user.id, { role });

    res.json({
      message: 'Role updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('❌ Update role error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// ROUTE 4: TEST ROUTE
// =============================================
router.get('/test', (req, res) => {
  res.json({
    message: 'Google OAuth routes are working!',
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: 'http://localhost:5000/api/oauth/google/callback',
  });
});

module.exports = router;