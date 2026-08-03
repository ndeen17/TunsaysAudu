import mongoose from 'mongoose';

// Small binary assets the app needs to persist (currently just the invite
// background image). Stored in Mongo rather than on local disk because the
// production host's filesystem isn't guaranteed to survive a redeploy.
const assetSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    mimeType: { type: String, required: true },
    data: { type: Buffer, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Asset', assetSchema);
