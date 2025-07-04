// api/auth.js
// TODO: Migrate Google OAuth, session, and user profile logic here.
// NOTE: File-based DB (lowdb) and in-memory sessions will NOT work on Vercel. Use a cloud DB (e.g., MongoDB Atlas) and JWTs or a cloud session store.

import dbConnect from '../lib/mongoose.js';
import User from '../models/User.js';
import { signJwt, verifyJwt } from '../lib/jwt.js';
import oauth2Client from '../scheduler-backend/utils/oauthClient.js';
import { google } from 'googleapis';
import cookie from 'cookie';

const MENTOR_EMAILS = ['shivani8477@gmail.com', 'f20230352@pilani.bits-pilani.ac.in'];
const isProd = process.env.NODE_ENV === 'production';
const frontendRedirect = isProd
  ? 'https://conq-port.vercel.app/dashboard'
  : 'http://localhost:3001/dashboard';

// TODO: Implement JWT-based authentication for stateless session management

export default async function handler(req, res) {
  await dbConnect();

  // Example: handle different auth routes
  if (req.method === 'GET' && req.url.startsWith('/google')) {
    // Google OAuth redirect logic
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      redirect_uri: oauth2Client.redirectUri,
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/calendar',
        'openid',
      ],
    });
    res.writeHead(302, { Location: url });
    res.end();
  } else if (req.method === 'GET' && req.url.startsWith('/google/callback')) {
    // Google OAuth callback logic
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const code = urlObj.searchParams.get('code');
    try {
      const { tokens } = await oauth2Client.getToken({ code, redirect_uri: oauth2Client.redirectUri });
      oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
      const { data } = await oauth2.userinfo.get();
      const user = {
        email: data.email,
        name: data.name,
        picture: data.picture,
        role: MENTOR_EMAILS.includes(data.email) ? 'mentor' : 'founder',
      };
      await User.findOneAndUpdate({ email: user.email }, { $set: user }, { upsert: true });
      const jwt = signJwt(user, { expiresIn: '7d' });
      res.setHeader('Set-Cookie', cookie.serialize('jwt', jwt, {
        httpOnly: true,
        secure: isProd,
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
        sameSite: 'lax',
      }));
      res.writeHead(302, { Location: frontendRedirect });
      res.end();
    } catch (err) {
      res.status(500).send('Login failed.');
    }
  } else if (req.method === 'GET' && req.url.startsWith('/me')) {
    // Get JWT from cookies
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.jwt;
    const user = verifyJwt(token);
    if (!user) return res.status(401).json({ message: 'Invalid or expired token' });
    res.json(user);
  } else if (req.method === 'POST' && req.url.startsWith('/setup')) {
    // Save user profile logic using Mongoose, require JWT
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.jwt;
    const userFromToken = verifyJwt(token);
    if (!userFromToken) return res.status(401).json({ message: 'Invalid or expired token' });
    try {
      const { role, startupName, expertise, linkedin } = req.body;
      const update = { role, startupName, expertise, linkedin };
      const user = await User.findOneAndUpdate(
        { email: userFromToken.email },
        { $set: update },
        { upsert: true, new: true }
      );
      res.json({ message: 'Profile saved!', user });
    } catch (err) {
      res.status(500).json({ message: 'Failed to save profile', error: err.message });
    }
  } else if (req.method === 'POST' && req.url.startsWith('/logout')) {
    // Clear the JWT cookie
    res.setHeader('Set-Cookie', cookie.serialize('jwt', '', {
      httpOnly: true,
      secure: isProd,
      expires: new Date(0),
      path: '/',
      sameSite: 'lax',
    }));
    res.json({ message: 'Logged out successfully' });
  } else {
    res.status(404).json({ message: 'Not found' });
  }
} 