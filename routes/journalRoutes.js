const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/journalController');
const { authRequired } = require('../middleware/auth');

router.use(authRequired);

router.post('/', ctrl.createJournal);
router.get('/me', ctrl.myJournals);
router.get('/student/:studentId', ctrl.studentJournals);
router.put('/:journalId/comment', ctrl.commentJournal);

module.exports = router;
