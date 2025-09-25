// Simple test script to connect to all three WebSocket ports
const WebSocket = require('ws');

console.log('Testing multi-port WebSocket connections...\n');

// Connect to port 3000 (main UI)
const ws3000 = new WebSocket('ws://localhost:3000/ui-updates');
ws3000.on('open', () => {
  console.log('✅ Connected to port 3000 (main UI)');
});
ws3000.on('message', (data) => {
  const message = JSON.parse(data);
  console.log(`📨 Port 3000: ${message.log}`);
});

// Connect to port 4001
const ws4001 = new WebSocket('ws://localhost:4001');
ws4001.on('open', () => {
  console.log('✅ Connected to port 4001');
});
ws4001.on('message', (data) => {
  const message = JSON.parse(data);
  console.log(`📨 Port 4001: ${message.log}`);
});

// Connect to port 5001
const ws5001 = new WebSocket('ws://localhost:5001');
ws5001.on('open', () => {
  console.log('✅ Connected to port 5001');
});
ws5001.on('message', (data) => {
  const message = JSON.parse(data);
  console.log(`📨 Port 5001: ${message.log}`);
});

// Handle errors
[ws3000, ws4001, ws5001].forEach((ws, index) => {
  const ports = [3000, 4001, 5001];
  ws.on('error', (error) => {
    console.log(`❌ Error on port ${ports[index]}:`, error.message);
  });
});

console.log('\nAll connections initiated. Waiting for messages...\n');
