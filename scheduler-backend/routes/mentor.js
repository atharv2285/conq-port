import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { google } from 'googleapis';
import db from '../db.mjs';

const router = express.Router();

// Helper function to decode JWT token
function decodeToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  try {
    const token = authHeader.substring(7);
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    return decoded;
  } catch (error) {
    console.error('Token decode error:', error);
    return null;
  }
}

function getOAuthClient(tokens) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

// 🧠 Add Slot
router.post('/slots', async (req, res) => {
  console.log('🔍 Creating new slot...');
  
  const user = decodeToken(req.headers.authorization);
  if (!user || !user.tokens || !user.email) {
    console.log('❌ Unauthorized slot creation attempt');
    return res.status(401).json({ message: 'Unauthorized. Please log in.' });
  }

  const { time, endTime } = req.body;
  console.log('📅 Slot time:', time, 'to', endTime, 'for user:', user.email);
  
  const startDate = new Date(time);
  const endDate = new Date(endTime);

  // Check for duplicate slots
  await db.read();
  const existingSlot = db.data.slots.find(s => 
    s.mentorEmail === user.email && 
    s.time === time && 
    s.endTime === endTime
  );
  
  if (existingSlot) {
    console.log('⚠️ Duplicate slot detected, returning existing slot');
    return res.status(409).json({ 
      message: 'Slot already exists for this time', 
      slot: existingSlot 
    });
  }

  const oauth2Client = getOAuthClient(user.tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const event = {
    summary: `Mentor Slot with ${user.email}`,
    description: 'Mentorship Call Slot',
    start: {
      dateTime: startDate.toISOString(),
      timeZone: 'Asia/Kolkata',
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'Asia/Kolkata',
    },
    attendees: [{ email: user.email }],
    conferenceData: {
      createRequest: {
        requestId: uuidv4(),
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  try {
    console.log('📅 Creating Google Calendar event...');
    const calendarEvent = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
    });

    const meetLink = calendarEvent.data.conferenceData?.entryPoints?.find(
      e => e.entryPointType === 'video'
    )?.uri || null;

    const newSlot = {
      id: uuidv4(),
      mentorEmail: user.email,
      mentorName: user.name,
      time,
      endTime,
      isBooked: false,
      bookedBy: null,
      bookedByName: null,
      googleEventId: calendarEvent.data.id,
      meetLink,
      mentorTokens: user.tokens,
    };

    db.data.slots.push(newSlot);
    await db.write();

    console.log('✅ Slot created successfully:', newSlot.id);
    res.json({ message: '✅ Slot added with calendar event', event, slot: newSlot });
  } catch (error) {
    console.error('❌ Error creating slot:', error);
    const err = error?.response?.data?.error || error.message;
    res.status(500).json({ message: 'Failed to create calendar event', details: err });
  }
});

// ❌ Cancel Slot
router.delete('/slots/:id', async (req, res) => {
  const user = decodeToken(req.headers.authorization);
  if (!user || user.role !== 'mentor') {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const { id } = req.params;
  await db.read();
  const index = db.data.slots.findIndex(s => s.id === id && s.mentorEmail === user.email);
  if (index === -1) return res.status(404).json({ message: 'Slot not found or not authorized.' });

  const slot = db.data.slots[index];
  const oauth2Client = getOAuthClient(slot.mentorTokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    if (slot.googleEventId) {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: slot.googleEventId,
      });
    }
    db.data.slots.splice(index, 1);
    await db.write();
    res.json({ message: '✅ Slot cancelled and removed from calendar' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to cancel slot.' });
  }
});

// 📅 Book Slot
router.post('/book', async (req, res) => {
  const user = decodeToken(req.headers.authorization);
  if (!user || !user.tokens || !user.email) {
    return res.status(401).json({ message: 'Unauthorized. Please log in.' });
  }

  const { id } = req.body;
  await db.read();
  const slot = db.data.slots.find(s => s.id === id);

  if (!slot || slot.isBooked) {
    return res.status(400).json({ message: '❌ Slot not available.' });
  }

  slot.isBooked = true;
  slot.bookedBy = user.email;
  slot.bookedByName = user.name;

  const oauth2Client = getOAuthClient(slot.mentorTokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    await calendar.events.patch({
      calendarId: 'primary',
      eventId: slot.googleEventId,
      resource: {
        attendees: [
          { email: slot.mentorEmail },
          { email: user.email },
        ],
        summary: `Mentorship Call with ${user.email}`,
      },
      sendUpdates: 'all',
    });

    await db.write();
    res.json({ message: '✅ Slot booked and Gmail invite sent!' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to book and send invite.' });
  }
});

router.get('/slots', async (req, res) => {
  const user = decodeToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await db.read();
  const { role, email } = user;

  let slots;

  if (role === 'mentor') {
    // Mentor sees all their slots
    slots = db.data.slots.filter(s => s.mentorEmail === email);
  } else {
    // Founder sees:
    // 1. Available slots
    // 2. Slots they booked
    slots = db.data.slots.filter(
      s => !s.isBooked || s.bookedBy === email
    );
  }

  res.json(slots);
});

export default router;
