const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authRequired, requireRole } = require('../middleware/auth');

router.use(authRequired);

// Admin: lihat semua pengguna
router.get('/', requireRole('admin'), (req, res) => {
  const rows = db.prepare('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC').all();
  res.json({ users: rows });
});

// Admin: nonaktifkan / aktifkan akun (mis. moderasi keamanan)
router.put('/:id/status', requireRole('admin'), (req, res) => {
  const { is_active } = req.body;
  if (is_active === undefined) return res.status(400).json({ error: 'is_active wajib diisi (0/1).' });
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, req.params.id);
  res.json({ message: 'Status akun diperbarui.' });
});

module.exports = router;
