import mongoose from 'mongoose';

// Where the guest's name and QR code get drawn onto the invite background.
// Singleton document (one invite design at a time), positions are absolute
// pixels in the background image's native resolution — the editor UI maps
// its own display scale back to that before saving.
const inviteLayoutSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    namePos: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
    nameStyle: {
      fontSize: { type: Number, default: 64 },
      color: { type: String, default: '#2a2420' },
      letterSpacing: { type: Number, default: 2 },
      uppercase: { type: Boolean, default: false },
    },
    qrPos: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
    qrSize: { type: Number, default: 220 },
  },
  { timestamps: true }
);

export default mongoose.model('InviteLayout', inviteLayoutSchema);
