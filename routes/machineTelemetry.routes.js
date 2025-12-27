const express = require("express");
const {
  createTelemetry,
  getTelemetry,
  getLatestTelemetry,
} = require("../controllers/machineTelemetry.controller");

const router = express.Router();

router.post("/", createTelemetry);
router.get("/", getTelemetry);
router.get("/latest", getLatestTelemetry);

module.exports = router;

