const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/classController');
const materialCtrl = require('../controllers/materialController');
const assignmentCtrl = require('../controllers/assignmentController');
const forumCtrl = require('../controllers/forumController');
const quizCtrl = require('../controllers/quizController');
const { authRequired, requireRole } = require('../middleware/auth');

router.use(authRequired);

router.post('/', requireRole('guru'), ctrl.createClass);
router.get('/', ctrl.listClasses);
router.post('/join', requireRole('siswa'), ctrl.joinClass);
router.get('/:id', ctrl.requireMemberOrTeacher, ctrl.getClass);

const passClassId = (req, res, next) => { req.params.id = req.params.classId; next(); };

// Materials
router.post('/:classId/materials', ctrl.requireTeacherOfClass, materialCtrl.addMaterial);
router.get('/:classId/materials', passClassId, ctrl.requireMemberOrTeacher, materialCtrl.listMaterials);

// Assignments
router.post('/:classId/assignments', ctrl.requireTeacherOfClass, assignmentCtrl.createAssignment);
router.get('/:classId/assignments', passClassId, ctrl.requireMemberOrTeacher, assignmentCtrl.listAssignments);

// Forum
router.post('/:classId/forum/threads', passClassId, ctrl.requireMemberOrTeacher, forumCtrl.createThread);
router.get('/:classId/forum/threads', passClassId, ctrl.requireMemberOrTeacher, forumCtrl.listThreads);

// Quiz
router.post('/:classId/quizzes', ctrl.requireTeacherOfClass, quizCtrl.createQuiz);
router.get('/:classId/quizzes', passClassId, ctrl.requireMemberOrTeacher, quizCtrl.listQuizzes);

module.exports = router;
