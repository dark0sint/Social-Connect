const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

exports.addMaterial = (req, res) => {
  const { title, content, file_url } = req.body;
  if (!title) return res.status(400).json({ error: 'title wajib diisi.' });
  const id = uuidv4();
  db.prepare('INSERT INTO materials (id, class_id, title, content, file_url, created_by) VALUES (?,?,?,?,?,?)')
    .run(id, req.params.classId, title, content || null, file_url || null, req.user.id);
  res.status(201).json({ message: 'Materi berhasil ditambahkan.', material: { id, title, content, file_url } });
};

exports.listMaterials = (req, res) => {
  const rows = db.prepare('SELECT * FROM materials WHERE class_id = ? ORDER BY created_at DESC').all(req.params.classId);
  res.json({ materials: rows });
};
