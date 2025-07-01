import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import passport from 'passport';

// Route imports
import authRoutes from './routes/auth.js';
import mentorRoutes from './routes/mentor.js';
import slotRoutes from './routes/slots.js';
import './utils/passport.js'; // Loads passport strategy config

// ✅ Load environment variables from .env
dotenv.config();

const app = express(); // Initialize express app

// ✅ Environment flag for localhost vs production
const isProduction = process.env.NODE_ENV === 'production';

// ✅ CORS Middleware
// Allows requests from frontend, passes cookies
app.use(cors({
  origin: ['http://localhost:3001'], // local frontend
  credentials: true,                // allow sending cookies
}));

// ✅ JSON body parsing + cookies
app.use(cookieParser());
app.use(express.json()); // Parses incoming JSON requests

// ✅ Session configuration
app.use(session({
  name: 'conq.sid',                            // Custom cookie name
  secret: process.env.SESSION_SECRET || 'dev', // Secret to encrypt session
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,                      // True in production (https)
    httpOnly: true,                            // JS can't access cookie
    sameSite: isProduction ? 'none' : 'lax',   // CORS + cookie control
    maxAge: 7 * 24 * 60 * 60 * 1000,           // 7 days
  },
}));

// ✅ Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// ✅ API Routes
app.use('/api/auth', authRoutes);    // Google login, session info
app.use('/api/mentor', mentorRoutes); // Mentor-specific logic
app.use('/api', slotRoutes);         // Slot booking routes

// ✅ Basic Health Check
app.get('/', (req, res) => {
  res.send('🔐 Smart Scheduler API running');
});

// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
