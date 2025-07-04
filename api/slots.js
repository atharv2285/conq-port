// api/slots.js
// TODO: Migrate enriched slots logic here.
// NOTE: File-based DB (lowdb) and in-memory sessions will NOT work on Vercel. Use a cloud DB (e.g., MongoDB Atlas) and JWTs or a cloud session store.

import dbConnect from '../lib/mongoose.js';
import Slot from '../models/Slot.js';
import User from '../models/User.js';
import { verifyJwt } from '../lib/jwt.js';
import cookie from 'cookie';

// TODO: Implement JWT-based authentication for stateless session management

export default async function handler(req, res) {
  await dbConnect();
  const cookies = cookie.parse(req.headers.cookie || '');
  const user = verifyJwt(cookies.jwt);
  if (!user) return res.status(401).json({ message: 'Invalid or expired token' });

  if (req.method === 'GET') {
    // Get enriched slots logic using Mongoose
    try {
      let rawSlots;
      if (user.role === 'mentor') {
        rawSlots = await Slot.find({ mentorEmail: user.email });
      } else {
        rawSlots = await Slot.find({ isBooked: false });
      }
      // Enrich slots with mentor and founder names
      const enrichedSlots = await Promise.all(rawSlots.map(async (slot) => {
        const mentor = await User.findOne({ email: slot.mentorEmail });
        const founder = slot.bookedBy ? await User.findOne({ email: slot.bookedBy }) : null;
        return {
          ...slot.toObject(),
          mentorName: mentor?.name || slot.mentorName || slot.mentorEmail,
          bookedByName: founder?.name || slot.bookedByName || slot.bookedBy || null,
        };
      }));
      res.json(enrichedSlots);
    } catch (err) {
      res.status(500).json({ message: 'Failed to get enriched slots', error: err.message });
    }
  } else {
    res.status(404).json({ message: 'Not found' });
  }
} 