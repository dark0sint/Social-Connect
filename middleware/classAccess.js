const db = require('../config/db');

// Memastikan user adalah guru pemilik kelas
function isClassTeacher(classId, userId) {
  const row = db.prepare('SELECT id FROM classes WHERE id = ? AND teacher_id = ?').get(classId, userId);
  return !!row;
}

// Memastikan siswa adalah anggota kelas
function isClassMember(classId, studentId) {
  const row = db.prepare('SELECT id FROM class_members WHERE class_id = ? AND student_id = ?').get(classId, studentId);
  return !!row;
}

// Orang tua boleh melihat data anaknya
function isParentOfStudent(parentId, studentId) {
  const row = db.prepare('SELECT id FROM parent_links WHERE parent_id = ? AND student_id = ?').get(parentId, studentId);
  return !!row;
}

module.exports = { isClassTeacher, isClassMember, isParentOfStudent };
