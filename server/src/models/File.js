import mongoose from 'mongoose';
const fileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, default: 'application/octet-stream' },
  size: { type: Number, default: 0 },
  storageName: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'File', default: null },
  isFolder: { type: Boolean, default: false },
  starred: { type: Boolean, default: false },
  trashed: { type: Boolean, default: false },
  shareToken: { type: String, default: null }
}, { timestamps: true });
fileSchema.index({ owner: 1, parent: 1, trashed: 1 });
export default mongoose.model('File', fileSchema);
