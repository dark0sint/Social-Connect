const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/quizController');
const { authRequired, requireRole } = require('../middleware/auth');

router.use(authRequired);

router.get('/:quizId', ctrl.getQuizForStudent);
router.post('/:quizId/attempt', requireRole('siswa'), ctrl.attemptQuiz);
router.get('/:quizId/results', requireRole('guru', 'admin'), ctrl.quizResults);

module.exports = router;
