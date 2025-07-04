// api/mentor.js
// TODO: Migrate slot creation, cancellation, booking, and retrieval logic here.
// NOTE: File-based DB (lowdb) and in-memory sessions will NOT work on Vercel. Use a cloud DB (e.g., MongoDB Atlas) and JWTs or a cloud session store.

import dbConnect from '../lib/mongoose.js';
import Slot from '../models/Slot.js';
import { verifyJwt } from '../lib/jwt.js';
import cookie from 'cookie';

// TODO: Implement JWT-based authentication for stateless session management

export default async function handler(req, res) {
  await dbConnect();
  const cookies = cookie.parse(req.headers.cookie || '');
  const user = verifyJwt(cookies.jwt);
  if (!user) return res.status(401).json({ message: 'Invalid or expired token' });

  if (req.method === 'POST' && req.url.startsWith('/slots')) {
    // Add slot logic using Mongoose
    try {
      const { time, endTime, googleEventId, meetLink, mentorTokens } = req.body;
      const slot = await Slot.create({
        mentorEmail: user.email,
        mentorName: user.name,
        time,
        endTime,
        isBooked: false,
        bookedBy: null,
        bookedByName: null,
        googleEventId,
        meetLink,
        mentorTokens,
      });
      res.json({ message: 'Slot added', slot });
    } catch (err) {
      res.status(500).json({ message: 'Failed to add slot', error: err.message });
    }
  } else if (req.method === 'DELETE' && req.url.startsWith('/slots')) {
    // Cancel slot logic using Mongoose
    try {
      const { id } = req.query;
      const slot = await Slot.findByIdAndDelete(id);
      if (!slot) return res.status(404).json({ message: 'Slot not found' });
      res.json({ message: 'Slot cancelled', slot });
    } catch (err) {
      res.status(500).json({ message: 'Failed to cancel slot', error: err.message });
    }
  } else if (req.method === 'POST' && req.url.startsWith('/book')) {
    // Book slot logic using Mongoose
    try {
      const { id } = req.body;
      const slot = await Slot.findById(id);
      if (!slot || slot.isBooked) return res.status(400).json({ message: 'Slot not available.' });
      slot.isBooked = true;
      slot.bookedBy = user.email;
      slot.bookedByName = user.name;
      await slot.save();
      res.json({ message: 'Slot booked', slot });
    } catch (err) {
      res.status(500).json({ message: 'Failed to book slot', error: err.message });
    }
  } else if (req.method === 'GET' && req.url.startsWith('/slots')) {
    // Get slots logic using Mongoose
    try {
      let slots;
      if (user.role === 'mentor') {
        slots = await Slot.find({ mentorEmail: user.email });
      } else {
        slots = await Slot.find({ $or: [ { isBooked: false }, { bookedBy: user.email } ] });
      }
      res.json(slots);
    } catch (err) {
      res.status(500).json({ message: 'Failed to get slots', error: err.message });
    }
  } else {
    res.status(404).json({ message: 'Not found' });
  }
} 