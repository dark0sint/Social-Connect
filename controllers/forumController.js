const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

exports.createThread = (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title wajib diisi.' });
  const id = uuidv4();
  db.prepare('INSERT INTO forum_threads (id, class_id, title, created_by) VALUES (?,?,?,?)')
    .run(id, req.params.classId, title, req.user.id);
  res.status(201).json({ message: 'Diskusi berhasil dibuat.', thread: { id, title } });
};

exports.listThreads = (req, res) => {
  const rows = db.prepare(`
    SELECT t.*, u.name as author_name,
      (SELECT COUNT(*) FROM forum_posts p WHERE p.thread_id = t.id) as post_count
    FROM forum_threads t JOIN users u ON u.id = t.created_by
    WHERE t.class_id = ? ORDER BY t.created_at DESC
  `).all(req.params.classId);
  res.json({ threads: rows });
};

exports.addPost = (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content wajib diisi.' });
  const thread = db.prepare('SELECT * FROM forum_threads WHERE id = ?').get(req.params.threadId);
  if (!thread) return res.status(404).json({ error: 'Diskusi tidak ditemukan.' });

  const id = uuidv4();
  db.prepare('INSERT INTO forum_posts (id, thread_id, author_id, content) VALUES (?,?,?,?)')
    .run(id, thread.id, req.user.id, content);
  res.status(201).json({ message: 'Balasan berhasil dikirim.', post_id: id });
};

exports.listPosts = (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, u.name as author_name, u.role as author_role
    FROM forum_posts p JOIN users u ON u.id = p.author_id
    WHERE p.thread_id = ? ORDER BY p.created_at ASC
  `).all(req.params.threadId);
  res.json({ posts: rows });
};
