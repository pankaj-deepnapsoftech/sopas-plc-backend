const MachineTelemetry = require("../models/machineTelemetry");
const { TryCatch } = require("../utils/error");

exports.createTelemetry = TryCatch(async (req, res) => {
  const {
    machine_id,
    timestamp,
    temperature_c,
    pressure_bar,
    motor,
    light_status,
    production_count,
  } = req.body;

  if (!machine_id) {
    return res.status(400).json({ success: false, message: "machine_id is required" });
  }
  if (!timestamp) {
    return res.status(400).json({ success: false, message: "timestamp is required" });
  }

  const normalizeMotor = (val) => {
    if (val == null) return undefined;
    if (typeof val === "string") {
      return { status: val };
    }
    if (typeof val === "number") {
      return { rpm: val };
    }
    if (typeof val === "object") {
      return {
        rpm: typeof val.rpm === "number" ? val.rpm : undefined,
        status: typeof val.status === "string" ? val.status : undefined,
      };
    }
    return undefined;
  };

  const doc = await MachineTelemetry.create({
    machine_id,
    timestamp: new Date(timestamp),
    temperature_c,
    pressure_bar,
    motor: normalizeMotor(motor),
    light_status,
    production_count,
  });

  return res.status(201).json({ success: true, data: doc });
});

exports.getTelemetry = TryCatch(async (req, res) => {
  const { machine_id, since, until, limit } = req.query;
  const filter = {};
  if (machine_id) filter.machine_id = machine_id;
  if (since || until) {
    filter.timestamp = {};
    if (since) filter.timestamp.$gte = new Date(since);
    if (until) filter.timestamp.$lte = new Date(until);
  }
  const lim = Number(limit) > 0 ? Number(limit) : 100;
  const data = await MachineTelemetry.find(filter).sort({ timestamp: -1 }).limit(lim);
  return res.status(200).json({ success: true, count: data.length, data });
});

exports.getLatestTelemetry = TryCatch(async (req, res) => {
  const { machine_id } = req.query;
  const filter = {};
  if (machine_id) filter.machine_id = machine_id;
  const doc = await MachineTelemetry.findOne(filter).sort({ timestamp: -1 });
  return res.status(200).json({ success: true, data: doc });
});

