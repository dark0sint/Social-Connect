const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { isParentOfStudent } = require('../middleware/classAccess');

// Siswa membuat jurnal refleksi harian
exports.createJournal = (req, res) => {
  if (req.user.role !== 'siswa') return res.status(403).json({ error: 'Hanya siswa yang dapat membuat jurnal refleksi.' });
  const { entry_date, mood, content } = req.body;
  if (!entry_date || !content) return res.status(400).json({ error: 'entry_date dan content wajib diisi.' });

  const id = uuidv4();
  db.prepare('INSERT INTO journals (id, student_id, entry_date, mood, content) VALUES (?,?,?,?,?)')
    .run(id, req.user.id, entry_date, mood || null, content);
  res.status(201).json({ message: 'Jurnal refleksi berhasil disimpan.', journal_id: id });
};

exports.myJournals = (req, res) => {
  if (req.user.role !== 'siswa') return res.status(403).json({ error: 'Hanya siswa yang dapat melihat jurnal miliknya sendiri di sini.' });
  const rows = db.prepare('SELECT * FROM journals WHERE student_id = ? ORDER BY entry_date DESC').all(req.user.id);
  res.json({ journals: rows });
};

// Guru dan orang tua (dari siswa terkait) dapat memantau jurnal siswa
exports.studentJournals = (req, res) => {
  const studentId = req.params.studentId;
  const isTeacher = req.user.role === 'guru';
  const isParent = req.user.role === 'orangtua' && isParentOfStudent(req.user.id, studentId);
  const isAdmin = req.user.role === 'admin';
  const isSelf = req.user.role === 'siswa' && req.user.id === studentId;

  if (!isTeacher && !isParent && !isAdmin && !isSelf) {
    return res.status(403).json({ error: 'Anda tidak memiliki akses untuk memantau jurnal siswa ini.' });
  }

  const rows = db.prepare('SELECT * FROM journals WHERE student_id = ? ORDER BY entry_date DESC').all(studentId);
  res.json({ journals: rows });
};

// Guru memberi komentar pada jurnal siswa
exports.commentJournal = (req, res) => {
  if (req.user.role !== 'guru') return res.status(403).json({ error: 'Hanya guru yang dapat memberi komentar.' });
  const { teacher_comment } = req.body;
  if (!teacher_comment) return res.status(400).json({ error: 'teacher_comment wajib diisi.' });

  const journal = db.prepare('SELECT * FROM journals WHERE id = ?').get(req.params.journalId);
  if (!journal) return res.status(404).json({ error: 'Jurnal tidak ditemukan.' });

  db.prepare('UPDATE journals SET teacher_comment = ? WHERE id = ?').run(teacher_comment, journal.id);
  res.json({ message: 'Komentar berhasil ditambahkan.' });
};
