const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/assignmentController');
const { authRequired, requireRole } = require('../middleware/auth');

router.use(authRequired);

router.post('/:assignmentId/submit', requireRole('siswa'), ctrl.submitAssignment);
router.get('/:assignmentId/submissions', requireRole('guru', 'admin'), ctrl.listSubmissions);
router.put('/submissions/:submissionId/grade', requireRole('guru'), ctrl.gradeSubmission);
router.get('/grades/me', ctrl.myGrades);
router.get('/grades/student/:studentId', requireRole('guru', 'orangtua', 'admin'), ctrl.myGrades);

module.exports = router;
