const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

exports.createAssignment = (req, res) => {
  const { title, instructions, due_date, max_score } = req.body;
  if (!title) return res.status(400).json({ error: 'title wajib diisi.' });
  const id = uuidv4();
  db.prepare(
    'INSERT INTO assignments (id, class_id, title, instructions, due_date, max_score, created_by) VALUES (?,?,?,?,?,?,?)'
  ).run(id, req.params.classId, title, instructions || null, due_date || null, max_score || 100, req.user.id);
  res.status(201).json({ message: 'Tugas berhasil dibuat.', assignment: { id, title, instructions, due_date, max_score } });
};

exports.listAssignments = (req, res) => {
  const rows = db.prepare('SELECT * FROM assignments WHERE class_id = ? ORDER BY created_at DESC').all(req.params.classId);
  res.json({ assignments: rows });
};

exports.submitAssignment = (req, res) => {
  if (req.user.role !== 'siswa') return res.status(403).json({ error: 'Hanya siswa yang dapat mengumpulkan tugas.' });
  const { content, file_url } = req.body;
  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.assignmentId);
  if (!assignment) return res.status(404).json({ error: 'Tugas tidak ditemukan.' });

  const existing = db.prepare('SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ?')
    .get(assignment.id, req.user.id);

  if (existing) {
    db.prepare('UPDATE submissions SET content = ?, file_url = ?, submitted_at = datetime(\'now\'), score = NULL, feedback = NULL WHERE id = ?')
      .run(content || null, file_url || null, existing.id);
    return res.json({ message: 'Pengumpulan tugas berhasil diperbarui.' });
  }

  const id = require('uuid').v4();
  db.prepare('INSERT INTO submissions (id, assignment_id, student_id, content, file_url) VALUES (?,?,?,?,?)')
    .run(id, assignment.id, req.user.id, content || null, file_url || null);
  res.status(201).json({ message: 'Tugas berhasil dikumpulkan.', submission_id: id });
};

exports.listSubmissions = (req, res) => {
  const rows = db.prepare(`
    SELECT s.*, u.name as student_name FROM submissions s
    JOIN users u ON u.id = s.student_id
    WHERE s.assignment_id = ?
    ORDER BY s.submitted_at DESC
  `).all(req.params.assignmentId);
  res.json({ submissions: rows });
};

exports.gradeSubmission = (req, res) => {
  const { score, feedback } = req.body;
  if (score === undefined) return res.status(400).json({ error: 'score wajib diisi.' });
  const sub = db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.submissionId);
  if (!sub) return res.status(404).json({ error: 'Pengumpulan tidak ditemukan.' });

  db.prepare('UPDATE submissions SET score = ?, feedback = ?, graded_at = datetime(\'now\') WHERE id = ?')
    .run(score, feedback || null, sub.id);
  res.json({ message: 'Penilaian berhasil disimpan.' });
};

exports.myGrades = (req, res) => {
  const rows = db.prepare(`
    SELECT s.*, a.title as assignment_title, a.max_score FROM submissions s
    JOIN assignments a ON a.id = s.assignment_id
    WHERE s.student_id = ?
    ORDER BY s.submitted_at DESC
  `).all(req.params.studentId || req.user.id);
  res.json({ grades: rows });
};
