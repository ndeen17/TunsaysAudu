import mongoose from 'mongoose';

const checkinEventSchema = new mongoose.Schema(
  {
    at: { type: Date, required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    overridden: { type: Boolean, default: false },
  },
  { _id: false }
);

const guestSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true },
    envelopeName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    partyId: { type: String, trim: true, index: true },
    rsvpStatus: { type: String, enum: ['yes', 'no', 'pending'], default: 'pending' },
    table: { type: String, trim: true, default: null },
    seat: { type: String, trim: true, default: null },
    qrToken: { type: String, required: true, unique: true, index: true },
    checkedIn: { type: Boolean, default: false },
    checkinEvents: [checkinEventSchema],
    inviteGeneratedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Guest', guestSchema);
