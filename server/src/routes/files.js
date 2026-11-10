import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import File from '../models/File.js';
import protect from '../middleware/auth.js';
import { uploadsDir, removeFileTree } from '../utils/fileHelpers.js';
const router = Router();
fs.mkdirSync(uploadsDir, { recursive: true });
const maxBytes = (Number(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024;
const storage = multer.diskStorage({ destination: uploadsDir, filename: (_req, _file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(_file.originalname).slice(0, 12)}`) });
const upload = multer({ storage, limits: { fileSize: maxBytes } });
router.get('/public/:token', async (req, res) => {
  const item = await File.findOne({ shareToken: req.params.token, trashed: false, isFolder: false });
  if (!item) return res.status(404).json({ message: 'Shared file not found' });
  res.json({ name: item.name, size: item.size, mimeType: item.mimeType, downloadUrl: `/api/files/public/${item.shareToken}/download` });
});
router.get('/public/:token/download', async (req, res) => {
  const item = await File.findOne({ shareToken: req.params.token, trashed: false, isFolder: false });
  if (!item) return res.status(404).json({ message: 'Shared file not found' });
  res.download(path.join(uploadsDir, item.storageName), item.name);
});
router.use(protect);
router.get('/', async (req, res) => {
  const { parent = '', q = '', view = 'all' } = req.query;
  const filter = { owner: req.user._id, trashed: view === 'trash' };
  if (view === 'starred') filter.starred = true;
  else if (view !== 'trash') filter.parent = parent || null;
  if (q) filter.name = { $regex: q.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), $options: 'i' };
  const items = await File.find(filter).sort({ isFolder: -1, name: 1 }).select('-storageName');
  res.json({ items });
});
router.post('/folder', async (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ message: 'Folder name is required' });
  const parent = req.body.parent || null;
  if (parent && !await File.exists({ _id: parent, owner: req.user._id, isFolder: true, trashed: false })) return res.status(404).json({ message: 'Parent folder not found' });
  const folder = await File.create({ name, originalName: name, storageName: `folder-${crypto.randomUUID()}`, owner: req.user._id, parent, isFolder: true });
  res.status(201).json({ item: folder });
});
router.post('/upload', upload.array('files', 20), async (req, res) => {
  const parent = req.body.parent || null;
  if (parent && !await File.exists({ _id: parent, owner: req.user._id, isFolder: true, trashed: false })) return res.status(404).json({ message: 'Parent folder not found' });
  const docs = await Promise.all((req.files || []).map(f => File.create({ name: f.originalname, originalName: f.originalname, mimeType: f.mimetype, size: f.size, storageName: f.filename, owner: req.user._id, parent })));
  res.status(201).json({ items: docs.map(({ _doc }) => ({ ..._doc, storageName: undefined })) });
});
router.patch('/:id', async (req, res) => {
  const item = await File.findOne({ _id: req.params.id, owner: req.user._id });
  if (!item) return res.status(404).json({ message: 'Item not found' });
  if (typeof req.body.name === 'string' && req.body.name.trim()) item.name = req.body.name.trim();
  if (typeof req.body.starred === 'boolean') item.starred = req.body.starred;
  if (typeof req.body.trashed === 'boolean') item.trashed = req.body.trashed;
  if (req.body.parent !== undefined) {
    if (item.isFolder && String(req.body.parent) === String(item._id)) return res.status(400).json({ message: 'A folder cannot be moved into itself' });
    const parent = req.body.parent || null;
    if (parent && !await File.exists({ _id: parent, owner: req.user._id, isFolder: true, trashed: false })) return res.status(404).json({ message: 'Destination folder not found' });
    item.parent = parent;
  }
  await item.save(); res.json({ item: { ...item.toObject(), storageName: undefined } });
});
router.delete('/:id', async (req, res) => {
  const item = await File.findOne({ _id: req.params.id, owner: req.user._id });
  if (!item) return res.status(404).json({ message: 'Item not found' });
  const wasTrashed = item.trashed;
  if (wasTrashed) await removeFileTree(item);
  else { item.trashed = true; await item.save(); }
  res.json({ message: wasTrashed ? 'Deleted permanently' : 'Moved to trash' });
});
router.post('/:id/restore', async (req, res) => {
  const item = await File.findOne({ _id: req.params.id, owner: req.user._id, trashed: true });
  if (!item) return res.status(404).json({ message: 'Trashed item not found' });
  item.trashed = false; await item.save(); res.json({ item });
});
router.get('/:id/download', async (req, res) => {
  const item = await File.findOne({ _id: req.params.id, owner: req.user._id, isFolder: false, trashed: false });
  if (!item) return res.status(404).json({ message: 'File not found' });
  res.download(path.join(uploadsDir, item.storageName), item.name);
});
router.post('/:id/share', async (req, res) => {
  const item = await File.findOne({ _id: req.params.id, owner: req.user._id, isFolder: false, trashed: false });
  if (!item) return res.status(404).json({ message: 'File not found' });
  if (!item.shareToken) item.shareToken = crypto.randomBytes(24).toString('hex');
  await item.save(); res.json({ url: `${process.env.CLIENT_URL}/share/${item.shareToken}` });
});
export default router;
