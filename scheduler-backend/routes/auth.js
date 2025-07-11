import express from 'express';
import { google } from 'googleapis';
import oauth2Client from '../utils/oauthClient.js';
import db from '../db.mjs';
import startupMentorMap from '../utils/startupMentorMap.json' assert { type: 'json' };

const router = express.Router();

const MENTOR_EMAILS = [
  'rahul_yadava@outlook.com',
  'pgroy1@gmail.com',
  'pantuvarali@gmail.com',
  'Venkat.rm@gmail.com',
  'pjajoo@gmail.com',
  'Startupediacommunity@gmail.com',
  'sheshadriv@gmail.com',
  'apoorv@excluto.com',
  'Sridhar.mulakaluri@gmail.com',
  'daingamar@gmail.com',
  'vikas@kapture.cx',
  'advani@gmail.com',
  'rahul@mesh.ai',
  'vibhu.nsit@gmail.com',
  'malkanifaiz@gmail.com',
  'kagarwal@a5gnet.com',
  'sameer@chavan.me',
  'vipin.tyagi@gmail.com',
  'vikasch90@gmail.com',
  'himanshuperiwal@gmail.com',
  'mohitschauhan2010@gmail.com',
  'subrat.pani@oneassist.in',
  'priyanka@cieraadvisors.com',
  'subin@groyyo.com',
  'vikas@shoffr.in',
  'madhava.venkatesh@trustrace.com',
  'mohsin.syed@kiwitech.com',
  'santosh.hunugund@gmail.com',
  'abhinavjainranka@gmail.com',
  'as.shah.07@gmail.com',
  'ajay.jain788@gmail.com',
  'leena.elizabethj@gmail.com',
  'contactveda@gmail.com',
  'mukul.bagga@medicomhealthcare.com',
  'lastmansurfing@gmail.com',
  'vigneshpoojari@gmail.com',
  'geetanjali_sahi@yahoo.co.in',
  'arjunnohwar@gmail.com',
  'Rohitsiitb@gmail.com',
  'mail@shreyasachar.com',
  '2ksaurabh@gmail.com',
  'pranay.gupta@gmail.com'
];

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

    const user = {
      email: data.email,
      name: data.name,
      picture: data.picture,
      role: MENTOR_EMAILS.includes(data.email) ? 'mentor' : 'founder',
      tokens: tokens, // Include OAuth tokens for calendar operations
    };

    // Create a simple token (base64 encoded user data)
    const token = Buffer.from(JSON.stringify(user)).toString('base64');

    console.log('✅ Logged in:', user);

    const frontendRedirect = isProd
      ? `${process.env.FRONTEND_URL}/dashboard?token=${token}`
      : `http://localhost:3001/dashboard?token=${token}`;

    res.redirect(frontendRedirect);
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).send('Login failed.');
  }
});

// 👉 Token check
router.get('/me', (req, res) => {
  let token = req.query.token;
  
  // If no token in query, try Authorization header
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const userData = Buffer.from(token, 'base64').toString();
    const user = JSON.parse(userData);
    res.json(user);
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
});

// 👉 Save user profile
router.post('/setup', async (req, res) => {
  let token = req.query.token;
  
  // If no token in query, try Authorization header
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const userData = Buffer.from(token, 'base64').toString();
    const user = JSON.parse(userData);
    const { role, startupName, expertise, linkedin } = req.body;

    if (role === 'founder') {
      // Validate startup name (case sensitive, must be ALL CAPS)
      const found = startupMentorMap.find(
        entry => entry.startup === startupName.trim().toUpperCase()
      );
      if (!found) {
        return res.status(400).json({ message: 'Startup name not found. Please enter the name in ALL CAPS as per the list.' });
      }
    }

    await db.read();
    db.data ||= {};
    db.data.users ||= [];
    const index = db.data.users.findIndex(u => u.email === user.email);
    const updatedUser = {
      ...user,
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
    await db.write();
    // Create new token with updated user data
    const newToken = Buffer.from(JSON.stringify(updatedUser)).toString('base64');
    res.json({ message: '✅ Profile saved!', token: newToken });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
});

export default router;
