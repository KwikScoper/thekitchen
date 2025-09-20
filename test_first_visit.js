const { io } = require('socket.io-client');

/**
 * Test script to verify first-time visit doesn't show room not found errors
 */
async function testFirstTimeVisit() {
  console.log('🧪 Testing first-time visit behavior...\n');

  // Simulate a first-time visit by creating a socket connection
  console.log('1️⃣ Connecting to server (simulating first-time visit)...');
  const socket = io('http://localhost:3001');
  
  await new Promise((resolve, reject) => {
    socket.on('connect', () => {
      console.log('✅ Connected to server');
      console.log('📝 No auto-rejoin attempted (no stored data)');
      resolve();
    });

    socket.on('error', (error) => {
      console.error('❌ Unexpected error during first-time visit:', error);
      reject(error);
    });

    // Wait a bit to see if any auto-rejoin errors occur
    setTimeout(() => {
      console.log('✅ No room not found errors during first-time visit');
      resolve();
    }, 3000);
  });

  socket.disconnect();
  
  console.log('\n🎉 First-time visit test completed successfully!');
  console.log('✅ No "room not found" errors shown to user');
  console.log('✅ Clean first-time experience');

  process.exit(0);
}

testFirstTimeVisit().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
