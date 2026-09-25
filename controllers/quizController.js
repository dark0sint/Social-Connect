const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Body: { title, time_limit_minutes, questions: [{question, options: [], correct_index, points}] }
exports.createQuiz = (req, res) => {
  const { title, time_limit_minutes, questions } = req.body;
  if (!title || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'title dan minimal 1 questions wajib diisi.' });
  }

  const quizId = uuidv4();
  const insertQuiz = db.prepare('INSERT INTO quizzes (id, class_id, title, time_limit_minutes, created_by) VALUES (?,?,?,?,?)');
  const insertQuestion = db.prepare('INSERT INTO quiz_questions (id, quiz_id, question, options, correct_index, points) VALUES (?,?,?,?,?,?)');

  const tx = db.transaction(() => {
    insertQuiz.run(quizId, req.params.classId, title, time_limit_minutes || null, req.user.id);
    for (const q of questions) {
      if (!q.question || !Array.isArray(q.options) || q.correct_index === undefined) {
        throw new Error('Setiap pertanyaan harus memiliki question, options (array), dan correct_index.');
      }
      insertQuestion.run(uuidv4(), quizId, q.question, JSON.stringify(q.options), q.correct_index, q.points || 10);
    }
  });

  try {
    tx();
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  res.status(201).json({ message: 'Kuis berhasil dibuat.', quiz_id: quizId });
};

exports.listQuizzes = (req, res) => {
  const rows = db.prepare('SELECT id, title, time_limit_minutes, created_at FROM quizzes WHERE class_id = ? ORDER BY created_at DESC').all(req.params.classId);
  res.json({ quizzes: rows });
};

// Untuk siswa mengerjakan: sembunyikan correct_index
exports.getQuizForStudent = (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.quizId);
  if (!quiz) return res.status(404).json({ error: 'Kuis tidak ditemukan.' });
  const questions = db.prepare('SELECT id, question, options, points FROM quiz_questions WHERE quiz_id = ?').all(quiz.id)
    .map(q => ({ ...q, options: JSON.parse(q.options) }));
  res.json({ quiz: { id: quiz.id, title: quiz.title, time_limit_minutes: quiz.time_limit_minutes }, questions });
};

// Body: { answers: [chosen_index_per_question_in_order] }
exports.attemptQuiz = (req, res) => {
  if (req.user.role !== 'siswa') return res.status(403).json({ error: 'Hanya siswa yang dapat mengerjakan kuis.' });
  const { answers } = req.body;
  if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers (array) wajib diisi.' });

  const questions = db.prepare('SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY rowid ASC').all(req.params.quizId);
  if (questions.length === 0) return res.status(404).json({ error: 'Kuis tidak ditemukan atau belum ada soal.' });

  const already = db.prepare('SELECT id FROM quiz_attempts WHERE quiz_id = ? AND student_id = ?').get(req.params.quizId, req.user.id);
  if (already) return res.status(409).json({ error: 'Anda sudah mengerjakan kuis ini.' });

  let score = 0, maxScore = 0;
  questions.forEach((q, i) => {
    maxScore += q.points;
    if (answers[i] !== undefined && Number(answers[i]) === q.correct_index) {
      score += q.points;
    }
  });

  const id = uuidv4();
  db.prepare('INSERT INTO quiz_attempts (id, quiz_id, student_id, answers, score, max_score) VALUES (?,?,?,?,?,?)')
    .run(id, req.params.quizId, req.user.id, JSON.stringify(answers), score, maxScore);

  res.status(201).json({ message: 'Kuis berhasil dikumpulkan. Nilai otomatis dihitung.', score, max_score: maxScore });
};

exports.quizResults = (req, res) => {
  const rows = db.prepare(`
    SELECT qa.*, u.name as student_name FROM quiz_attempts qa
    JOIN users u ON u.id = qa.student_id
    WHERE qa.quiz_id = ? ORDER BY qa.submitted_at DESC
  `).all(req.params.quizId);
  res.json({ results: rows });
};
