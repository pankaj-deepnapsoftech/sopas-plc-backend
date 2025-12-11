const { TryCatch } = require("../utils/error");
const MachineStatus = require("../models/machineStatus");

// ---------- Pools & helpers ----------
const devicePool = ["MACHINE-01", "MACHINE-02", "MACHINE-03", "MACHINE-04", "MACHINE-05"];
const designPool = ["Design-A", "Design-B", "Design-C", "Design-D", "Design-E"];
const statusPool = ["running", "idle", "maintenance", "stopped"];
const shiftPool = ["A", "B", "C"];

const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max, digits = 1) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(digits));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Store current machine data state for all devices
let currentMachines = devicePool.map((id) => buildMachinePayload(id));

// Build a single payload
function buildMachinePayload(deviceId) {
  return {
    device_id: deviceId,
    count: randomBetween(80, 160),
    design: pick(designPool),
    efficiency: randomFloat(75, 98),
    error1: randomBetween(0, 5),
    error2: randomBetween(0, 3),
    status: pick(statusPool),
    shift: pick(shiftPool),
    timestamp: new Date().toISOString(),
  };
}

// Function to generate random variations for all machines
function generateRandomDataForAll() {
  currentMachines = currentMachines.map((machine) => ({
    ...machine,
    count: randomBetween(80, 160),
    design: pick(designPool),
    efficiency: randomFloat(75, 98),
    error1: randomBetween(0, 5),
    error2: randomBetween(0, 3),
    status: pick(statusPool),
    shift: pick(shiftPool),
    timestamp: new Date().toISOString(),
  }));

  return currentMachines.map((m) => ({ ...m }));
}

// API endpoint to get current machine data
exports.getMachineData = TryCatch(async (req, res) => {
  const data = generateRandomDataForAll();

  return res.status(200).json({
    success: true,
    data,
    count: data.length,
  });
});

// Function to start auto-update interval (called from index.js)
let updateInterval = null;

exports.startAutoUpdate = (io) => {
  // Clear any existing interval
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  
  // Emit updates every 3 seconds
  updateInterval = setInterval(async () => {
    const updatedData = generateRandomDataForAll();

    // Persist to DB so frontend can query from database if needed
    const bulkOps = updatedData.map((doc) => ({
      updateOne: {
        filter: { device_id: doc.device_id },
        update: { $set: doc },
        upsert: true,
      },
    }));
    try {
      await MachineStatus.bulkWrite(bulkOps);
    } catch (err) {
      console.error("Failed to persist machine data", err);
    }

    // Emit to clients in the "machineData" room via Socket.IO
    if (io) {
      io.to("machineData").emit("machineDataUpdate", updatedData);
    }

    console.log("Machine data updated:", updatedData);
  }, 3000); // 3 seconds = 3000 milliseconds
  
  console.log('✅ Auto-update started: Machine data will update every 3 seconds');
};

exports.stopAutoUpdate = () => {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
    console.log('⏹️ Auto-update stopped');
  }
};

// Export function to get current data without generating new
exports.getCurrentMachineData = () => {
  return currentMachines.map((m) => ({ ...m }));
};

exports.seedMachineStatuses = TryCatch(async (req, res) => {
  const payload = devicePool.map((id) => buildMachinePayload(id));

  const bulkOps = payload.map((doc) => ({
    updateOne: {
      filter: { device_id: doc.device_id },
      update: { $set: doc },
      upsert: true,
    },
  }));

  await MachineStatus.bulkWrite(bulkOps);

  // Broadcast seeded data to connected clients (optional live preview)
  if (global.io) {
    global.io.to("machineData").emit("machineDataSeed", payload);
  }

  return res.status(200).json({
    success: true,
    message: "Seeded machine statuses for demo",
    count: payload.length,
    data: payload,
  });
});

