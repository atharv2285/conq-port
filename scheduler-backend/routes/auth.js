import express from 'express';
import { google } from 'googleapis';
import oauth2Client from '../utils/oauthClient.js';
import db from '../db.mjs';

const router = express.Router();

const MENTOR_EMAILS = ['shivani8477@gmail.com', 'f20230352@pilani.bits-pilani.ac.in'];

const isProd = process.env.NODE_ENV === 'production';
const redirect_uri = isProd
  ? process.env.GOOGLE_REDIRECT_URI
  : process.env.LOCAL_REDIRECT_URI;

// 👉 Step 1: Redirect to Google OAuth
router.get('/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    redirect_uri,
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/calendar',
      'openid',
    ],
  });
  res.redirect(url);
});

// 👉 Step 2: Handle Google callback
router.get('/google/callback', async (req, res) => {
  const code = req.query.code;

  try {
    const { tokens } = await oauth2Client.getToken({ code, redirect_uri });
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
    const { data } = await oauth2.userinfo.get();

    req.session.tokens = tokens;
    req.session.email = data.email;
    req.session.user = {
      email: data.email,
      name: data.name,
      picture: data.picture,
      role: MENTOR_EMAILS.includes(data.email) ? 'mentor' : 'founder',
    };

    console.log('✅ Logged in:', req.session.user);

    const frontendRedirect = isProd
      ? 'https://conq-port.vercel.app/dashboard'
      : 'http://localhost:3001/dashboard';

    res.redirect(frontendRedirect);
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).send('Login failed.');
  }
});

// 👉 Session check
router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Not logged in' });
  }
  res.json(req.session.user);
});

// 👉 Save user profile
router.post('/setup', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Not logged in' });
  }

  const { role, startupName, expertise, linkedin } = req.body;

  await db.read();
  db.data ||= {};
  db.data.users ||= [];

  const index = db.data.users.findIndex(u => u.email === req.session.user.email);

  const updatedUser = {
    ...req.session.user,
    role,
    startupName: startupName || null,
    expertise: expertise || null,
    linkedin: linkedin || null,
  };

  if (index !== -1) {
    db.data.users[index] = updatedUser;
  } else {
    db.data.users.push(updatedUser);
  }

  req.session.user = updatedUser;

  await db.write();
  res.json({ message: '✅ Profile saved!' });
});

// 🔍 DEBUG ROUTE: /test-session
router.get('/test-session', (req, res) => {
  if (req.session?.user) {
    res.send(`✅ Logged in as ${req.session.user.email}`);
  } else {
    res.status(401).send('❌ No session set');
  }
});


export default router;