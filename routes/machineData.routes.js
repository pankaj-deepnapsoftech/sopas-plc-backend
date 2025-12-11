const express = require('express');
const { getMachineData } = require('../controllers/machineData.controller');

const router = express.Router();

// GET endpoint to fetch current machine data
router.get('/machine-data', getMachineData);

module.exports = router;

