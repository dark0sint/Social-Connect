const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const VALID_ROLES = ['admin', 'guru', 'siswa', 'orangtua'];

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

exports.register = (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password, dan role wajib diisi.' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role harus salah satu dari: ${VALID_ROLES.join(', ')}` });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password minimal 8 karakter.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Email sudah terdaftar.' });

  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 12);
  db.prepare(
    'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name, email.toLowerCase(), hash, role);

  const user = { id, name, email: email.toLowerCase(), role };
  const token = signToken(user);
  res.status(201).json({ message: 'Registrasi berhasil.', token, user });
};

exports.login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email dan password wajib diisi.' });

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!row || !row.is_active) return res.status(401).json({ error: 'Email atau password salah.' });

  const ok = bcrypt.compareSync(password, row.password_hash);
  if (!ok) return res.status(401).json({ error: 'Email atau password salah.' });

  const user = { id: row.id, name: row.name, email: row.email, role: row.role };
  const token = signToken(user);
  res.json({ message: 'Login berhasil.', token, user });
};

exports.me = (req, res) => {
  const row = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: row });
};

// Orang tua mengajukan/menautkan diri ke akun siswa (mis. dengan email siswa)
exports.linkParentToStudent = (req, res) => {
  const { student_email } = req.body;
  if (req.user.role !== 'orangtua') return res.status(403).json({ error: 'Hanya akun orang tua yang dapat menautkan siswa.' });
  if (!student_email) return res.status(400).json({ error: 'student_email wajib diisi.' });

  const student = db.prepare('SELECT * FROM users WHERE email = ? AND role = ?').get(student_email.toLowerCase(), 'siswa');
  if (!student) return res.status(404).json({ error: 'Akun siswa tidak ditemukan.' });

  const existing = db.prepare('SELECT * FROM parent_links WHERE parent_id = ? AND student_id = ?').get(req.user.id, student.id);
  if (existing) return res.status(409).json({ error: 'Tautan sudah ada.' });

  const id = require('uuid').v4();
  db.prepare('INSERT INTO parent_links (id, parent_id, student_id, status) VALUES (?, ?, ?, ?)')
    .run(id, req.user.id, student.id, 'approved');

  res.status(201).json({ message: 'Berhasil menautkan akun ke siswa.', student: { id: student.id, name: student.name } });
};

exports.myChildren = (req, res) => {
  if (req.user.role !== 'orangtua') return res.status(403).json({ error: 'Hanya untuk akun orang tua.' });
  const rows = db.prepare(`
    SELECT u.id, u.name, u.email FROM parent_links pl
    JOIN users u ON u.id = pl.student_id
    WHERE pl.parent_id = ?
  `).all(req.user.id);
  res.json({ children: rows });
};
