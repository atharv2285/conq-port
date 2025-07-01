import express from 'express';
import db from '../db.mjs';

const router = express.Router();

// 🧠 GET enriched slots list (with names)
router.get('/slots', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await db.read();
  const role = req.session.user.role;

  const rawSlots =
    role === 'mentor'
      ? db.data.slots.filter(s => s.mentorEmail === req.session.user.email)
      : db.data.slots.filter(s => !s.isBooked);

  const enrichedSlots = rawSlots.map(slot => {
    const mentor = db.data.users.find(u => u.email === slot.mentorEmail);
    const founder = slot.bookedBy
      ? db.data.users.find(u => u.email === slot.bookedBy)
      : null;

    return {
      ...slot,
      mentorName: mentor?.name || slot.mentorName || slot.mentorEmail,
      bookedByName: founder?.name || slot.bookedByName || slot.bookedBy || null,
    };
  });

  res.json(enrichedSlots);
});

export default router;
