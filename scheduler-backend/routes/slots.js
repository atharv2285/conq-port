import express from 'express';
import db from '../db.mjs';

const router = express.Router();

// Helper function to decode JWT token
function decodeToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ No Bearer token found in header:', authHeader);
    return null;
  }
  try {
    const token = authHeader.substring(7);
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    console.log('✅ Token decoded successfully for user:', decoded.email);
    return decoded;
  } catch (error) {
    console.error('❌ Token decode error:', error);
    return null;
  }
}

// 🧠 GET enriched slots list (with names)
router.get('/slots', async (req, res) => {
  console.log('🔍 Slots API called with headers:', req.headers.authorization ? 'Authorization present' : 'No Authorization');
  
  const user = decodeToken(req.headers.authorization);
  if (!user) {
    console.log('❌ Unauthorized - no valid token');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    await db.read();
    console.log('✅ Database read successful');
    
    const role = user.role;
    console.log('👤 User role:', role, 'email:', user.email);

    const rawSlots =
      role === 'mentor'
        ? db.data.slots.filter(s => s.mentorEmail === user.email)
        : db.data.slots.filter(s => !s.isBooked);

    console.log('📅 Found', rawSlots.length, 'slots for user');

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

    console.log('✅ Returning', enrichedSlots.length, 'enriched slots');
    res.json(enrichedSlots);
  } catch (error) {
    console.error('❌ Error in slots API:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

export default router;
