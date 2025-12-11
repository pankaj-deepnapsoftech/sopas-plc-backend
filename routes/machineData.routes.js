const express = require('express');
const { getMachineData, seedMachineStatuses } = require('../controllers/machineData.controller');

const router = express.Router();

// GET endpoint to fetch current machine data
router.get('/machine-data', getMachineData);
router.post('/seed', seedMachineStatuses);

module.exports = router;

