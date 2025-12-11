const { TryCatch } = require("../utils/error");

// Store current machine data state
let currentMachineData = {
  device_id: "MACHINE-01",
  count: 120,
  design: "Design-A",
  efficiency: 87.5,
  error1: 2,
  error2: 0,
  status: "running",
  shift: "A",
  timestamp: new Date().toISOString()
};

// Function to generate random variations in data
function generateRandomData() {
  // Random count variation (100-150)
  currentMachineData.count = Math.floor(Math.random() * 51) + 100;
  
  // Random efficiency variation (80-95)
  currentMachineData.efficiency = parseFloat((Math.random() * 15 + 80).toFixed(1));
  
  // Random error1 (0-5)
  currentMachineData.error1 = Math.floor(Math.random() * 6);
  
  // Random error2 (0-3)
  currentMachineData.error2 = Math.floor(Math.random() * 4);
  
  // Random status
  const statuses = ["running", "idle", "maintenance", "stopped"];
  currentMachineData.status = statuses[Math.floor(Math.random() * statuses.length)];
  
  // Random shift
  const shifts = ["A", "B", "C"];
  currentMachineData.shift = shifts[Math.floor(Math.random() * shifts.length)];
  
  // Random design
  const designs = ["Design-A", "Design-B", "Design-C", "Design-D"];
  currentMachineData.design = designs[Math.floor(Math.random() * designs.length)];
  
  // Update timestamp
  currentMachineData.timestamp = new Date().toISOString();
  
  return { ...currentMachineData };
}

// API endpoint to get current machine data
exports.getMachineData = TryCatch(async (req, res) => {
  const data = generateRandomData();
  
  return res.status(200).json({
    success: true,
    data: data
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
  updateInterval = setInterval(() => {
    const updatedData = generateRandomData();
    
    // Emit to clients in the "machineData" room via Socket.IO
    if (io) {
      io.to('machineData').emit('machineDataUpdate', updatedData);
    }
    
    console.log('Machine data updated:', updatedData);
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
  return { ...currentMachineData };
};

