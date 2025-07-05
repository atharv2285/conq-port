// index.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// ✅ Route imports
import authRoutes from './routes/auth.js';
import mentorRoutes from './routes/mentor.js';
import slotRoutes from './routes/slots.js';

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
    'https://conq-port-git-main-atharv2285s-projects.vercel.app',
  ],
  credentials: true,
}));

// ✅ Body + Cookie parsers
app.use(cookieParser());
app.use(express.json());

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
