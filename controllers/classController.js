const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { isClassTeacher, isClassMember } = require('../middleware/classAccess');

function genJoinCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

exports.createClass = (req, res) => {
  const { name, subject, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name wajib diisi.' });

  const id = uuidv4();
  let joinCode = genJoinCode();
  while (db.prepare('SELECT id FROM classes WHERE join_code = ?').get(joinCode)) {
    joinCode = genJoinCode();
  }
  db.prepare(
    'INSERT INTO classes (id, name, subject, description, teacher_id, join_code) VALUES (?,?,?,?,?,?)'
  ).run(id, name, subject || null, description || null, req.user.id, joinCode);

  res.status(201).json({ message: 'Kelas berhasil dibuat.', class: { id, name, subject, description, join_code: joinCode } });
};

exports.listClasses = (req, res) => {
  let rows;
  if (req.user.role === 'guru') {
    rows = db.prepare('SELECT * FROM classes WHERE teacher_id = ?').all(req.user.id);
  } else if (req.user.role === 'siswa') {
    rows = db.prepare(`
      SELECT c.* FROM classes c
      JOIN class_members cm ON cm.class_id = c.id
      WHERE cm.student_id = ?
    `).all(req.user.id);
  } else {
    rows = db.prepare('SELECT * FROM classes').all();
  }
  res.json({ classes: rows });
};

exports.getClass = (req, res) => {
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Kelas tidak ditemukan.' });

  const members = db.prepare(`
    SELECT u.id, u.name, u.email FROM class_members cm
    JOIN users u ON u.id = cm.student_id WHERE cm.class_id = ?
  `).all(cls.id);

  res.json({ class: cls, members });
};

exports.joinClass = (req, res) => {
  if (req.user.role !== 'siswa') return res.status(403).json({ error: 'Hanya siswa yang dapat bergabung ke kelas.' });
  const { join_code } = req.body;
  if (!join_code) return res.status(400).json({ error: 'join_code wajib diisi.' });

  const cls = db.prepare('SELECT * FROM classes WHERE join_code = ?').get(join_code.toUpperCase());
  if (!cls) return res.status(404).json({ error: 'Kode kelas tidak valid.' });

  const already = db.prepare('SELECT id FROM class_members WHERE class_id = ? AND student_id = ?').get(cls.id, req.user.id);
  if (already) return res.status(409).json({ error: 'Anda sudah tergabung di kelas ini.' });

  db.prepare('INSERT INTO class_members (id, class_id, student_id) VALUES (?,?,?)')
    .run(uuidv4(), cls.id, req.user.id);

  res.status(201).json({ message: `Berhasil bergabung ke kelas ${cls.name}.`, class: cls });
};

exports.requireTeacherOfClass = (req, res, next) => {
  const classId = req.params.id || req.params.classId;
  if (req.user.role !== 'guru' || !isClassTeacher(classId, req.user.id)) {
    return res.status(403).json({ error: 'Hanya guru pemilik kelas yang dapat melakukan aksi ini.' });
  }
  next();
};

exports.requireMemberOrTeacher = (req, res, next) => {
  const classId = req.params.id || req.params.classId;
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
  if (!cls) return res.status(404).json({ error: 'Kelas tidak ditemukan.' });

  const isTeacher = cls.teacher_id === req.user.id;
  const isMember = req.user.role === 'siswa' && isClassMember(classId, req.user.id);
  if (!isTeacher && !isMember && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Anda bukan anggota kelas ini.' });
  }
  next();
};
