const { Schema, model } = require("mongoose");

const MotorSchema = new Schema(
  {
    rpm: { type: Number },
    status: { type: String },
  },
  { _id: false }
);

const MachineTelemetrySchema = new Schema(
  {
    machine_id: { type: String, required: true, index: true },
    timestamp: { type: Date, required: true, index: true },
    temperature_c: { type: Number },
    pressure_bar: { type: Number },
    motor: { type: MotorSchema },
    light_status: { type: String },
    production_count: { type: Number },
  },
  {
    timestamps: true,
  }
);

const MachineTelemetry = model("MachineTelemetry", MachineTelemetrySchema);
module.exports = MachineTelemetry;

