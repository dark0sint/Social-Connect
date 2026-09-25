const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { authRequired } = require('../middleware/auth');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/me', authRequired, ctrl.me);
router.post('/link-parent', authRequired, ctrl.linkParentToStudent);
router.get('/my-children', authRequired, ctrl.myChildren);

module.exports = router;
