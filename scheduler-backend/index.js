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

// ✅ Health check for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
  console.log(`🌍 Environment: ${isProduction ? 'Production' : 'Development'}`);
});

// ✅ Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// ✅ Error handling
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
