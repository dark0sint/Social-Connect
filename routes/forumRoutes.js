const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/forumController');
const { authRequired } = require('../middleware/auth');

router.use(authRequired);

router.post('/threads/:threadId/posts', ctrl.addPost);
router.get('/threads/:threadId/posts', ctrl.listPosts);

module.exports = router;
