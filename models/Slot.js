import mongoose from 'mongoose';

const SlotSchema = new mongoose.Schema({
  mentorEmail: String,
  mentorName: String,
  time: Date,
  endTime: Date,
  isBooked: Boolean,
  bookedBy: String,
  bookedByName: String,
  googleEventId: String,
  meetLink: String,
  mentorTokens: mongoose.Schema.Types.Mixed,
});

export default mongoose.models.Slot || mongoose.model('Slot', SlotSchema); 