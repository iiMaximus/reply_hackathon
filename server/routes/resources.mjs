import { Router } from 'express';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { z } from 'zod';
import { attachment, classAccess, id, insist, notify, text, title } from '../access.mjs';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 2 } });
const allowedImages = new Set(['image/png','image/jpeg','image/webp','image/gif']);

export function resourceRoutes(db) {
  const router = Router();
  router.post('/classes/:classId/files', upload.single('file'), async (req, res) => {
    const classroom = classAccess(db, req.user, req.params.classId);
    const purpose = z.enum(['question','answer','resource']).parse(req.body.purpose);
    insist(purpose !== 'question' || classroom.professor_id === req.user.id, 403, 'Only professors upload question images.');
    insist(purpose !== 'answer' || req.user.role === 'student', 403, 'Only students upload answer images.');
    insist(req.file, 400, 'Choose an image.');
    const type = await fileTypeFromBuffer(req.file.buffer).catch(() => null);
    insist(type && allowedImages.has(type.mime), 400, 'Use a PNG, JPEG, WebP or GIF image (8 MB maximum).');
    const result = db.prepare('INSERT INTO files(class_id,owner_id,purpose,name,mime,data) VALUES (?,?,?,?,?,?)')
      .run(classroom.id, req.user.id, purpose, req.file.originalname.slice(0, 200), type.mime, req.file.buffer);
    res.status(201).json({ id: Number(result.lastInsertRowid) });
  });
  router.get('/files/:fileId', (req, res) => {
    const file = db.prepare('SELECT * FROM files WHERE id=?').get(id.parse(req.params.fileId));
    insist(file, 404, 'Image not found.');
    const classroom = classAccess(db, req.user, file.class_id);
    const sharedResource = file.purpose === 'resource' && db.prepare("SELECT 1 FROM resources WHERE image_id=? AND status='approved'").get(file.id);
    insist(file.owner_id === req.user.id || classroom.professor_id === req.user.id || file.purpose === 'question' || sharedResource,
      403, 'This image is private.');
    res.set({ 'Content-Type': file.mime, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }).send(Buffer.from(file.data));
  });
  router.get('/classes/:classId/resources', (req, res) => {
    const classroom = classAccess(db, req.user, req.params.classId);
    const owner = classroom.professor_id === req.user.id;
    const resources = owner
      ? db.prepare('SELECT r.*,u.name AS author_name FROM resources r JOIN users u ON u.id=r.author_id WHERE class_id=? ORDER BY r.id DESC').all(classroom.id)
      : db.prepare("SELECT * FROM resources WHERE class_id=? AND (status='approved' OR author_id=?) ORDER BY id DESC").all(classroom.id, req.user.id);
    res.json({ resources });
  });
  router.post('/classes/:classId/resources', (req, res) => {
    const classroom = classAccess(db, req.user, req.params.classId);
    const input = z.object({ title, content: text.default(''),
      url: z.union([z.literal(''), z.url().refine(url => ['https:','http:'].includes(new URL(url).protocol))]).default(''),
      image_id: id.nullable().optional(),
    }).refine(r => r.content || r.url || r.image_id, { message: 'Add resource text, a link or an image.' }).parse(req.body);
    attachment(db, req.user, classroom.id, input.image_id, 'resource');
    const status = classroom.professor_id === req.user.id ? 'approved' : 'pending';
    const result = db.prepare('INSERT INTO resources(class_id,author_id,title,content,url,image_id,status) VALUES (?,?,?,?,?,?,?)')
      .run(classroom.id, req.user.id, input.title, input.content, input.url, input.image_id ?? null, status);
    if (status === 'pending') notify(db, classroom.professor_id, classroom.id, `${req.user.name} shared a resource for review: ${input.title}`);
    res.status(201).json({ id: Number(result.lastInsertRowid) });
  });
  router.patch('/resources/:resourceId', (req, res) => {
    const resource = db.prepare('SELECT * FROM resources WHERE id=?').get(id.parse(req.params.resourceId));
    insist(resource, 404, 'Resource not found.');
    classAccess(db, req.user, resource.class_id, true);
    const { status } = z.object({ status: z.enum(['approved','rejected']) }).parse(req.body);
    db.prepare('UPDATE resources SET status=? WHERE id=?').run(status, resource.id);
    res.json({ ok: true });
  });
  return router;
}
