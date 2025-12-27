const { Schema, model } = require("mongoose");

const machineStatusSchema = new Schema(
  {
    device_id: { type: String, required: true }, // 🔄 Renamed from "machine"
    count: { type: Number, required: true },
    design: { type: String, required: true },
    efficiency: { type: Number, required: true },
    error1: { type: Number, required: true },
    error2: { type: Number, required: true },
    status: { type: String, required: true },
    shift: { type: String, required: true },
    timestamp: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

// PLC DM words payload (used by /api/dashboard/plc-machine-data)
const plcMachineSchema = new Schema(
  {
      device_id: { type: String, default: "UNKNOWN" },
      timestamp: { type: Date, required: true }, // derived from payload `timestamp` or `time`
      dm_words: { type: [Number] }, // legacy support
      // New payload fields
      count: { type: Number },
      percent: { type: Number },
      countdown: { type: Number },
      raw: { type: [Number] },
  },  
  {
    timestamps: true,
  }
);

const MachineStatus = model("MachineStatus", machineStatusSchema);
const PlcMachine = model("PlcMachine", plcMachineSchema);

// Preserve existing default export and add PlcMachine for PLC routes
module.exports = MachineStatus;
module.exports.PlcMachine = PlcMachine;
