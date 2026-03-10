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

router.get('/users', ctrl.getUsers);
router.post('/users', ctrl.createUser);
router.put('/users/:id', ctrl.updateUser);
router.delete('/users/:id', ctrl.deleteUser);

router.get('/clients', ctrl.getClients);
router.post('/clients', ctrl.createClient);
router.put('/clients/:id', ctrl.updateClient);
router.delete('/clients/:id', ctrl.deleteClient);

module.exports = router;
