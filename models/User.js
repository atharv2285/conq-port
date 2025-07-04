import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  picture: String,
  role: String,
  startupName: String,
  expertise: String,
  linkedin: String,
});

export default mongoose.models.User || mongoose.model('User', UserSchema); 