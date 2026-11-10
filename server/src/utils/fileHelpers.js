import fs from 'fs/promises';
import path from 'path';
import File from '../models/File.js';
const uploadsDir = path.resolve('uploads');
export async function removeFileTree(doc) {
  if (doc.isFolder) {
    const children = await File.find({ parent: doc._id, owner: doc.owner });
    for (const child of children) await removeFileTree(child);
  } else {
    await fs.unlink(path.join(uploadsDir, doc.storageName)).catch(() => {});
  }
  await File.deleteOne({ _id: doc._id });
}
export { uploadsDir };
