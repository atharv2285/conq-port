// index.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import MongoStore from 'connect-mongo';

// ✅ Route imports
import authRoutes from './routes/auth.js';
import mentorRoutes from './routes/mentor.js';
import slotRoutes from './routes/slots.js';
import './utils/passport.js'; // Passport strategy config

// ✅ Load environment variables from .env
dotenv.config();

// ✅ Initialize express app
const app = express();

// ✅ Environment flag
const isProduction = process.env.NODE_ENV === 'production';

// ✅ CORS config: Allow Vercel and localhost
app.use(cors({
  origin: [
    'http://localhost:3001',
    'https://conq-port.vercel.app',
  ],
  credentials: true,
}));

// ✅ Body + Cookie parsers
app.use(cookieParser());
app.use(express.json());

// ✅ Session configuration with MongoDB store
app.use(session({
  name: 'conq.sid',
  secret: process.env.SESSION_SECRET || 'dev',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    ttl: 7 * 24 * 60 * 60, // 7 days
  }),
  cookie: {
    secure: isProduction,               // HTTPS-only in production
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,   // 7 days
  },
}));

// ✅ Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api', slotRoutes);

// ✅ Health check
app.get('/', (req, res) => {
  res.send('🔐 Smart Scheduler API running');
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
