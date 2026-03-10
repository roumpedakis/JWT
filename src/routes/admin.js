const express = require('express');
const router = express.Router();
const adminBasicAuth = require('../middleware/adminBasicAuth');
const ctrl = require('../controllers/adminController');

router.use(adminBasicAuth);

router.get('/codes', ctrl.getCodes);
router.put('/codes/:id', ctrl.updateCode);
router.delete('/codes/:id', ctrl.deleteCode);

router.get('/tokens', ctrl.getTokens);
router.put('/tokens/:id', ctrl.updateToken);
router.patch('/tokens/:id/revoke', ctrl.revokeToken);
router.delete('/tokens/:id', ctrl.deleteToken);

module.exports = router;
