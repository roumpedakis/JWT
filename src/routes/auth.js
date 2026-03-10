const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');

router.get('/code',           ctrl.getCode);
router.post('/sms',           ctrl.sendSms);
router.post('/token',         ctrl.issueTokens);
router.post('/token/refresh', ctrl.refreshToken);

module.exports = router;
